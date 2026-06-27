"""
Resume Analyzer — Hybrid Semantic + Structured Scoring Engine
=============================================================
Two entry points with identical output shapes:
  analyze_from_text()       -- PDF upload path (raw text only)
  analyze_from_structured() -- Redrob JSON path (full structured candidate dict)

Both call the same helper functions and produce the same 10-section result dict
that the frontend already consumes. The embedding engine + skill graph replace
all hardcoded keyword matching from the old local_analyzer.py.
"""
from __future__ import annotations
import re
from typing import Any

from app.services.embedding_engine import embed, cosine_sim, get_jd_embeddings
from app.services.skill_taxonomy import (
    skill_graph_affinity, match_skills_to_jd,
    extract_skills_from_text, get_cluster,
)
from app.services.jd_parser import parse_jd


# ---------------------------------------------------------------------------
# Labels
# ---------------------------------------------------------------------------

def compute_label(score: int) -> str:
    if score >= 81: return "Excellent"
    elif score >= 66: return "Strong"
    elif score >= 41: return "Average"
    else: return "Weak"


def _clamp(val: float, lo: float = 0.0, hi: float = 100.0) -> int:
    return int(max(lo, min(hi, val)))


# ---------------------------------------------------------------------------
# Scoring helpers (shared by both paths)
# ---------------------------------------------------------------------------

def _score_experience(yoe: float, min_exp: float, max_exp: float):
    if min_exp <= yoe <= max_exp:
        s = 95
        pos = [f"{yoe:.1f} years — within the preferred {min_exp:.0f}–{max_exp:.0f} year range."]
        neg = []
    elif (min_exp - 1.5) <= yoe < min_exp:
        s = 76
        pos = [f"{yoe:.1f} years experience, close to the preferred minimum."]
        neg = [f"Slightly under the preferred {min_exp:.0f}-year minimum."]
    elif max_exp < yoe <= (max_exp + 4):
        s = 80
        pos = [f"{yoe:.1f} years — senior profile beyond the stated range."]
        neg = ["May be over-qualified for the seniority level described."]
    elif yoe > max_exp + 4:
        s = 52
        pos = [f"Extensive {yoe:.1f} years of industry experience."]
        neg = ["Significantly over-qualified — compensation expectations may not align."]
    else:
        s = 38
        pos = []
        neg = [f"Experience ({yoe:.1f} yrs) falls below the {min_exp:.0f}-year minimum."]
    return _clamp(s), pos, neg


def _score_skills_structured(skills: list[dict], jd_required: list[str],
                              assessment_scores: dict[str, float] | None = None):
    if not skills:
        return 20, [], [], jd_required[:5]

    PROF_W = {"expert": 1.0, "advanced": 0.8, "intermediate": 0.55, "beginner": 0.3}
    skill_weights: dict[str, float] = {}
    for s in skills:
        name = s.get("name", "")
        if not name:
            continue
        prof  = PROF_W.get(str(s.get("proficiency", "beginner")).lower(), 0.3)
        dur   = min(float(s.get("duration_months", 0) or 0), 60.0)
        end   = min(int(s.get("endorsements",    0) or 0), 100)
        w = prof * 0.6 + (dur / 60.0) * 0.3 + (end / 100.0) * 0.1
        if assessment_scores:
            sc = assessment_scores.get(name)
            if sc is not None:
                w = w * 0.7 + (sc / 100.0) * 0.3
        skill_weights[name] = w

    names = list(skill_weights.keys())

    if not jd_required:
        avg = sum(skill_weights.values()) / len(skill_weights) if skill_weights else 0
        top = sorted(skill_weights.items(), key=lambda x: -x[1])[:4]
        pos = [f"Strong proficiency in {', '.join(n for n, _ in top)}."]
        return _clamp(avg * 100), pos, [], []

    mr = match_skills_to_jd(names, jd_required)
    matched, missing, cov = mr["matched"], mr["missing"], mr["coverage"]

    # Weight coverage by proficiency
    wc = sum(skill_weights.get(cm, 0.3) * aff for cm, _, aff in matched)
    if jd_required:
        wc /= len(jd_required)
    score = _clamp(cov * 60 + wc * 40)

    pos = []
    if matched:
        top = sorted(matched, key=lambda x: -x[2])[:4]
        pos.append(f"Demonstrated: {', '.join(m[0] for m in top if m[0])}.")
    verified = [n for n, sc in (assessment_scores or {}).items()
                if sc >= 70 and get_cluster(n)]
    if verified:
        pos.append(f"Platform-verified ({', '.join(verified[:3])}).")

    neg = [f"Not demonstrated: {', '.join(missing[:4])}."] if len(missing) > len(jd_required) * 0.4 else []
    return score, pos, neg, [m.capitalize() for m in missing[:5]]


def _score_skills_text(raw_text: str, jd_required: list[str]):
    cand = extract_skills_from_text(raw_text)
    # Check for direct matches using fallback semantic matching for custom skills not in taxonomy
    all_cand = cand.copy()
    for req in jd_required:
        if req.lower() in raw_text.lower() and req.lower() not in [c.lower() for c in all_cand]:
            all_cand.append(req)

    if not jd_required:
        return _clamp(30 + min(len(all_cand) * 4, 60)), [f"{len(all_cand)} relevant skills identified."], [], []

    mr = match_skills_to_jd(all_cand, jd_required)
    cov, matched, missing = mr["coverage"], mr["matched"], mr["missing"]
    score = _clamp(cov * 100)
    pos = [f"Aligned: {', '.join(m[0] for m in sorted(matched, key=lambda x: -x[2])[:5] if m[0])}."] if matched else []
    neg = [f"Missing key requirements: {', '.join(missing[:4])}."] if missing else []
    return score, pos, neg, [m.capitalize() for m in missing[:5]]


def _extract_yoe_from_text(raw_text: str) -> float:
    # 1. Look for explicit mentions of YOE
    m = re.search(r'(\d+(?:\.\d+)?)\s*(?:\+\s*)?(?:years?|yrs?|yoe)\s*(?:of\s+)?(?:professional\s+|work\s+|industry\s+)?experience', raw_text, re.IGNORECASE)
    if m:
        val = float(m.group(1))
        if 0.5 <= val <= 30.0:
            return val

    # 2. Extract and sum date range spans (e.g. "2021 - 2025" or "2023 to Present")
    spans = re.findall(r'\b(19\d{2}|20\d{2})\s*[-\u2013\u2014to\s]+\s*(19\d{2}|20\d{2}|present|current|now)\b', raw_text, re.IGNORECASE)
    total_yoe = 0.0
    for start_s, end_s in spans:
        start_yr = int(start_s)
        if end_s.lower() in ["present", "current", "now"]:
            end_yr = 2026
        else:
            try:
                end_yr = int(end_s)
            except ValueError:
                end_yr = start_yr
        
        span = end_yr - start_yr
        if 0 < span <= 15:  # filter outliers
            total_yoe += span
            
    if total_yoe > 0:
        return min(total_yoe, 25.0)

    # 3. Fallback: if single years are listed, take the max span
    years = [int(y) for y in re.findall(r'\b(19\d{2}|20\d{2})\b', raw_text)]
    if len(years) >= 2:
        valid_years = [y for y in years if 1990 <= y <= 2026]
        if len(valid_years) >= 2:
            span = max(valid_years) - min(valid_years)
            if 1 <= span <= 20:
                return float(span)

    return 2.5  # default mid-junior fallback


def _score_trajectory_structured(career: list[dict]):
    if not career:
        return 50, ["No career history available."]

    def _months(s):
        if not s: return 0
        try:
            p = s.split("-"); return int(p[0]) * 12 + (int(p[1]) if len(p) > 1 else 0)
        except: return 0

    sorted_c = sorted(career, key=lambda r: _months(r.get("start_date")))
    SENIORITY = {"intern": 0, "junior": 1, "associate": 2, "engineer": 3, "developer": 3,
                 "senior": 5, "staff": 6, "lead": 7, "principal": 8, "manager": 7,
                 "architect": 8, "director": 9, "vp": 10, "head": 9, "cto": 10,
                 "co-founder": 9, "founder": 9}

    def _seniority(t):
        t = t.lower()
        for kw, lvl in sorted(SENIORITY.items(), key=lambda x: -x[1]):
            if kw in t: return lvl
        return 3

    levels = [_seniority(r.get("title", "")) for r in sorted_c]
    score = 60
    pos = []
    if len(levels) >= 2 and levels[-1] > levels[0]:
        score += min((levels[-1] - levels[0]) * 8, 28)
        pos.append(f"Clear progression: {sorted_c[0].get('title','?')} → {sorted_c[-1].get('title','?')}.")
    elif levels:
        pos.append("Consistent seniority level maintained.")
    score += min(levels[-1] * 2 if levels else 0, 14)
    ai_roles = [r for r in career if any(kw in r.get("title","").lower()
                for kw in ["ai", "ml", "machine learning", "data science", "nlp", "scientist", "research"])]
    if ai_roles:
        score += 10
        pos.append(f"{len(ai_roles)} AI/ML-focused role(s) in career history.")
    short_stints = [r for r in career if not r.get("is_current") and (r.get("duration_months") or 0) < 6]
    score -= len(short_stints) * 5
    if not pos:
        pos.append(f"Career spanning {len(career)} role(s).")
    return _clamp(score), pos


def _score_trajectory_text(raw_text: str):
    words = set(re.findall(r'\b\w+\b', raw_text.lower()))
    senior_kw = {"senior", "lead", "principal", "staff", "manager", "director", "head", "architect", "vp", "founder", "cto"}
    prog_kw   = {"promoted", "promotion", "progressed", "grew", "advanced", "transitioned"}
    found_s = senior_kw & words
    found_p = prog_kw   & words
    score = 55 + min(len(found_s) * 5, 25) + min(len(found_p) * 8, 16)
    pos = []
    if found_s: pos.append(f"Seniority indicators: {', '.join(list(found_s)[:3])}.")
    if found_p: pos.append("Career narrative shows deliberate progression.")
    if not pos: pos.append("Career experience present.")
    return _clamp(score), pos


def _score_impact(text: str):
    metric_pats = [r'\b\d+(?:\.\d+)?%', r'\$\d[\d,]*(?:\.\d+)?[kmb]?',
                   r'\b\d+(?:\.\d+)?[km]\b', r'\b\d+x\b',
                   r'\bmillion\b', r'\bbillion\b', r'\blakhs?\b', r'\bcrores?\b']
    metrics = []
    for p in metric_pats:
        metrics.extend(re.findall(p, text, re.IGNORECASE)[:2])

    outcome_v = {"reduced","improved","increased","optimized","scaled","launched","saved",
                 "grew","accelerated","delivered","achieved","drove","led","built",
                 "shipped","deployed","outperformed","exceeded"}
    found_v = outcome_v & set(re.findall(r'\b\w+\b', text.lower()))

    score = _clamp(40 + min(len(metrics) * 10, 40) + min(len(found_v) * 4, 20))
    pos = []
    if metrics:  pos.append(f"Quantified outcomes: {', '.join(metrics[:3])}.")
    if found_v:  pos.append(f"Outcome verbs: {', '.join(list(found_v)[:3])}.")
    neg = ["Responsibilities stated without quantifiable business outcomes."] if not metrics else []
    return score, pos, neg


def _score_education_structured(education: list[dict]):
    if not education: return 55, ["No formal education listed."], []
    TIER = {"tier_1": 100, "tier_2": 82, "tier_3": 65, "tier_4": 50, "unknown": 58}
    best, pos, neg = 0, [], []
    for edu in education:
        ts = TIER.get(str(edu.get("tier","unknown")).lower(), 58)
        best = max(best, ts)
        deg, field, inst = edu.get("degree",""), edu.get("field_of_study",""), edu.get("institution","")
        rel = any(k in (field+deg).lower() for k in ["computer","software","ai","data","machine","electrical","maths","statistics","engineering"])
        if rel:
            best = min(best + 10, 100)
            pos.append(f"{deg} in {field} — highly relevant field.")
        else:
            pos.append(f"{deg} in {field} from {inst}.")
        if str(edu.get("tier","")).lower() == "tier_1":
            pos.append("Tier-1 institution (IIT/NIT/BITS equivalent).")
    return _clamp(best), pos, neg


def _score_education_text(raw_text: str):
    text = raw_text.lower()
    words = set(re.findall(r'\b\w+\b', text))
    tier1 = {"iit","nit","bits","pilani","iisc","iim","iiser","mit","stanford","cmu","berkeley"}
    tier2 = {"vit","manipal","srm","lpu","nmims","symbiosis","christ"}
    found_t1 = tier1 & words; found_t2 = tier2 & words
    cs = any(k in text for k in ["computer science","software engineering","cs","information technology",
                                   "data science","statistics","electronics"])
    deg = any(k in text for k in ["b.tech","btech","b.e","be ","m.tech","mtech","b.sc","bsc",
                                   "m.sc","msc","phd","ph.d","master","bachelor"])
    score = 55; pos = ["Educational credentials present."]; neg = []
    if found_t1: score = 95; pos.append(f"Tier-1 institution: {', '.join(found_t1)}.")
    elif found_t2: score = 72; pos.append("Reputed institution detected.")
    elif deg: score = 65
    if cs: score = min(score + 10, 100); pos.append("Degree in a directly relevant technical field.")
    if not deg: neg.append("No degree credentials clearly identified.")
    return _clamp(score), pos, neg


def _score_certs_structured(certs: list[dict]):
    if not certs: return 55, []
    VALUED = {"aws","google","microsoft","nvidia","deeplearning.ai","coursera",
               "linkedin learning","databricks","snowflake","mongodb"}
    score = min(55 + len(certs) * 7, 95); pos = []
    for c in certs[:4]:
        nm, iss = c.get("name",""), c.get("issuer","").lower()
        pos.append(f"{nm} ({c.get('issuer','')}, {c.get('year','')}).")
        if any(v in iss for v in VALUED): score = min(score + 3, 100)
    return _clamp(score), pos


def _score_certs_text(raw_text: str):
    words = set(re.findall(r'\b\w+\b', raw_text.lower()))
    cert_kw = {"certified","certification","certificate","aws","azure","coursera","udemy",
               "deeplearning","databricks","nvidia","tensorflow"}
    found = cert_kw & words
    score = _clamp(50 + min(len(found) * 10, 45))
    pos = [f"Certifications or learning credentials: {', '.join(list(found)[:3])}."] if found else []
    return score, pos


def _score_resume_quality_text(raw_text: str):
    words  = re.findall(r'\b[a-zA-Z]{2,}\b', raw_text)
    unique = len(set(w.lower() for w in words))
    secs   = sum(1 for k in ["experience","education","skills","project","summary","certification"] if k in raw_text.lower())
    score  = _clamp(30 + min(unique / 200 * 60, 60) + min(len(words) / 500 * 20, 20) + min(secs * 4, 20))
    pos = ["Well-structured with logical sections."]
    neg = ["Profile is very brief — may be insufficient for accurate scoring."] if unique < 80 else []
    if unique > 200: pos.append("Rich vocabulary and detailed content.")
    return score, pos, neg


def _score_signals(signals: dict):
    if not signals: return 70, []
    rr    = float(signals.get("recruiter_response_rate",    0.5) or 0.5)
    nd    = int(  signals.get("notice_period_days",          60) or  60)
    gh    = float(signals.get("github_activity_score",       -1) or  -1)
    ir    = float(signals.get("interview_completion_rate",  0.5) or 0.5)
    otw   = bool( signals.get("open_to_work_flag",        False))
    pc    = float(signals.get("profile_completeness_score", 70)  or  70)

    ns = 100 if nd<=15 else (90 if nd<=30 else (70 if nd<=60 else (50 if nd<=90 else 25)))
    gc = gh if gh >= 0 else 50
    score = _clamp(rr*100*0.25 + ns*0.20 + ir*100*0.20 + gc*0.15 + pc*0.10 + (100 if otw else 50)*0.10)

    pos = []
    if otw:      pos.append("Actively open to new opportunities.")
    if gh >= 60: pos.append(f"Strong GitHub activity (score: {gh:.0f}/100).")
    if nd <= 30: pos.append(f"{nd}-day notice period — available quickly.")
    if rr >= 0.7:pos.append(f"High recruiter responsiveness ({int(rr*100)}%).")
    return score, pos


def _overall_fit(resume_emb, jd_embs: dict, section_scores: list[int], section_keys: list[str]):
    sem = max(0, cosine_sim(resume_emb, jd_embs["full"])) * 100
    WEIGHTS = {"work_experience":0.18,"skills":0.22,"projects":0.12,"education":0.08,
               "certifications":0.05,"resume_quality":0.05,"trajectory":0.10,
               "impact_quality":0.10,"inferred_intent":0.10}
    sm = dict(zip(section_keys, section_scores))
    ws, tw = 0.0, 0.0
    for k, w in WEIGHTS.items():
        if k in sm: ws += sm[k]*w; tw += w
    wa = ws/tw if tw > 0 else 60.0
    score = _clamp(wa*0.70 + sem*0.30)
    detail = f"Semantic JD alignment: {int(sem)}%. Structured score: {int(wa)}%."
    return score, detail


# ---------------------------------------------------------------------------
# Public Entry Point 1: PDF / raw text path
# ---------------------------------------------------------------------------

def analyze_from_text(raw_text: str, job_title: str, job_desc: str, job_reqs: str, job_id: str = "unknown") -> dict:
    jd     = parse_jd(job_title, job_desc, job_reqs)
    jd_emb = get_jd_embeddings(job_id, job_title, job_desc, job_reqs)

    res_emb  = embed(raw_text[:4000])
    desc_sim = cosine_sim(res_emb, jd_emb["desc"])
    reqs_sim = cosine_sim(res_emb, jd_emb["reqs"])
    titl_sim = cosine_sim(res_emb, jd_emb["title"])

    yoe = _extract_yoe_from_text(raw_text)
    e_s, e_pos, e_neg = _score_experience(yoe, jd["min_exp"], jd["max_exp"])

    sk_s, sk_pos, sk_neg, sk_miss = _score_skills_text(raw_text, jd["required_skills"])
    sk_s = _clamp(sk_s * 0.70 + max(0, reqs_sim) * 100 * 0.30)

    action_kw = re.findall(r'\b(built|implemented|designed|launched|shipped|created|deployed)\b', raw_text, re.I)
    pr_s = _clamp(40 + max(0, desc_sim) * 40 + min(len(action_kw), 5) * 4)
    pr_pos = ["Technical achievements and project descriptions found."] if pr_s > 60 else ["Limited project detail."]
    pr_neg = [] if pr_s > 50 else ["No clear project outcomes described."]

    ed_s, ed_pos, ed_neg = _score_education_text(raw_text)
    ct_s, ct_pos         = _score_certs_text(raw_text)
    qu_s, qu_pos, qu_neg = _score_resume_quality_text(raw_text)
    tr_s, tr_pos         = _score_trajectory_text(raw_text)
    im_s, im_pos, im_neg = _score_impact(raw_text)

    in_s = _clamp(50 + max(0, titl_sim) * 50)
    in_pos = ["Career profile aligns semantically with the target role." if in_s >= 65
              else "Partial alignment with target role domain."]

    keys   = ["work_experience","skills","projects","education","certifications",
               "resume_quality","trajectory","impact_quality","inferred_intent"]
    scores = [e_s, sk_s, pr_s, ed_s, ct_s, qu_s, tr_s, im_s, in_s]
    ov_s, ov_detail = _overall_fit(res_emb, jd_emb, scores, keys)

    matched_skills = extract_skills_from_text(raw_text)[:3]
    sk_str = ", ".join(matched_skills) or "software engineering"
    ov_sum = f"Candidate with ~{yoe:.0f} YOE demonstrates skills in {sk_str}. {ov_detail} Rated {compute_label(ov_s)}."

    return {
        "overall_score": ov_s,
        "overall_summary": ov_sum,
        "scored_sections": [
            {"section_key":"work_experience","section_label":"Work Experience","score":e_s,
             "summary":f"Estimated {yoe:.1f} YOE vs {jd['min_exp']:.0f}–{jd['max_exp']:.0f} year requirement.",
             "positives":e_pos,"negatives":e_neg,"missing":[]},
            {"section_key":"skills","section_label":"Skills & Proficiencies","score":sk_s,
             "summary":"Skill graph matching + semantic overlap with JD requirements.",
             "positives":sk_pos,"negatives":sk_neg,"missing":sk_miss},
            {"section_key":"projects","section_label":"Projects","score":pr_s,
             "summary":"Project ownership detected from achievement language in resume.",
             "positives":pr_pos,"negatives":pr_neg,"missing":[]},
            {"section_key":"education","section_label":"Education","score":ed_s,
             "summary":"Academic background and credential assessment.",
             "positives":ed_pos,"negatives":ed_neg,"missing":[]},
            {"section_key":"certifications","section_label":"Certifications","score":ct_s,
             "summary":"Professional certifications and learning credentials.",
             "positives":ct_pos,"negatives":[],"missing":[]},
            {"section_key":"resume_quality","section_label":"Resume Quality","score":qu_s,
             "summary":"Resume structure, vocabulary richness, and section coverage.",
             "positives":qu_pos,"negatives":qu_neg,"missing":[]},
            {"section_key":"trajectory","section_label":"Career Trajectory","score":tr_s,
             "summary":"Seniority progression and career growth indicators.",
             "positives":tr_pos,"negatives":[],"missing":[]},
            {"section_key":"impact_quality","section_label":"Impact Quality","score":im_s,
             "summary":"Quantified business impact and outcome-driven language.",
             "positives":im_pos,"negatives":im_neg,"missing":[]},
            {"section_key":"inferred_intent","section_label":"Inferred Intent","score":in_s,
             "summary":"Semantic alignment between candidate profile and job title.",
             "positives":in_pos,"negatives":[],"missing":[]},
            {"section_key":"overall_fit","section_label":"Overall Fit","score":ov_s,
             "summary":"Composite of 9 weighted dimensions blended with semantic JD similarity.",
             "positives":[f"Overall {compute_label(ov_s)} match for this position."],
             "negatives":[],"missing":[]},
        ],
    }


# ---------------------------------------------------------------------------
# Public Entry Point 2: Redrob structured JSON path
# ---------------------------------------------------------------------------

def analyze_from_structured(candidate: dict[str, Any], job_title: str, job_desc: str,
                             job_reqs: str, job_id: str = "unknown") -> dict:
    profile  = candidate.get("profile",          {})
    career   = candidate.get("career_history",   [])
    skills   = candidate.get("skills",           [])
    education = candidate.get("education",       [])
    certs    = candidate.get("certifications",   [])
    signals  = candidate.get("redrob_signals",   {})

    jd     = parse_jd(job_title, job_desc, job_reqs)
    jd_emb = get_jd_embeddings(job_id, job_title, job_desc, job_reqs)

    summary_t = profile.get("summary",  "") or ""
    headline_t = profile.get("headline","") or ""
    career_t   = " ".join(r.get("description","") or "" for r in career)
    skills_t   = " ".join(s.get("name","")           for s in skills)
    all_t      = f"{headline_t} {summary_t} {career_t} {skills_t}"

    sum_emb    = embed(summary_t[:2000])  if summary_t else None
    career_emb = embed(career_t[:3000])   if career_t  else None
    skills_emb = embed(skills_t[:1000])   if skills_t  else None
    full_emb   = embed(all_t[:5000])

    career_sim = cosine_sim(career_emb, jd_emb["full"]) if career_emb is not None else 0.5
    skills_sim = cosine_sim(skills_emb, jd_emb["reqs"]) if skills_emb is not None else 0.5
    intent_sim = cosine_sim(sum_emb,    jd_emb["title"])if sum_emb    is not None else 0.5

    yoe = float(profile.get("years_of_experience", 0) or 0)
    e_s, e_pos, e_neg = _score_experience(yoe, jd["min_exp"], jd["max_exp"])
    e_s = _clamp(e_s * 0.75 + max(0, career_sim) * 100 * 0.25)

    assess = signals.get("skill_assessment_scores", {}) if signals else {}
    sk_s, sk_pos, sk_neg, sk_miss = _score_skills_structured(skills, jd["required_skills"], assess)
    sk_s = _clamp(sk_s * 0.75 + max(0, skills_sim) * 100 * 0.25)

    im_s, pr_pos, _ = _score_impact(career_t)
    pr_s = _clamp(im_s * 0.60 + max(0, career_sim) * 100 * 0.40)
    if pr_s > 65: pr_pos.insert(0, "Career descriptions demonstrate strong project ownership.")

    ed_s, ed_pos, ed_neg = _score_education_structured(education)
    ct_s, ct_pos         = _score_certs_structured(certs)

    pc   = float(signals.get("profile_completeness_score", 70) or 70) if signals else 70.0
    qu_s = _clamp(pc)
    qu_pos = [f"Profile completeness: {pc:.0f}/100."]
    qu_neg = ["Incomplete profile — several sections appear sparse."] if pc < 70 else []

    tr_s, tr_pos = _score_trajectory_structured(career)
    im_s, im_pos, im_neg = _score_impact(career_t + " " + summary_t)

    sig_s, sig_pos = _score_signals(signals)
    sem_intent = max(0, intent_sim) * 100
    in_s = _clamp(sig_s * 0.50 + sem_intent * 0.50)
    in_pos = sig_pos + [f"Profile aligns semantically with target role ({compute_label(int(sem_intent))})."]

    keys   = ["work_experience","skills","projects","education","certifications",
               "resume_quality","trajectory","impact_quality","inferred_intent"]
    scores = [e_s, sk_s, pr_s, ed_s, ct_s, qu_s, tr_s, im_s, in_s]
    ov_s, ov_detail = _overall_fit(full_emb, jd_emb, scores, keys)

    top_match = [s.get("name","") for s in skills if s.get("name") and get_cluster(s.get("name",""))][:3]
    sk_str  = ", ".join(top_match) or "software engineering"
    curr_t  = profile.get("current_title", "Professional")
    ov_sum  = f"{curr_t} with {yoe:.1f} YOE. Key skills: {sk_str}. {ov_detail} Rated {compute_label(ov_s)}."

    return {
        "overall_score": ov_s,
        "overall_summary": ov_sum,
        "scored_sections": [
            {"section_key":"work_experience","section_label":"Work Experience","score":e_s,
             "summary":f"{yoe:.1f} YOE evaluated against {jd['min_exp']:.0f}–{jd['max_exp']:.0f} year requirement.",
             "positives":e_pos,"negatives":e_neg,"missing":[]},
            {"section_key":"skills","section_label":"Skills & Proficiencies","score":sk_s,
             "summary":"Skill graph matching with proficiency × duration weighting + platform assessment scores.",
             "positives":sk_pos,"negatives":sk_neg,"missing":sk_miss},
            {"section_key":"projects","section_label":"Projects","score":pr_s,
             "summary":"Project ownership and technical depth assessed from career descriptions.",
             "positives":pr_pos,"negatives":[],"missing":[]},
            {"section_key":"education","section_label":"Education","score":ed_s,
             "summary":"Educational credentials, institution tier, and field relevance.",
             "positives":ed_pos,"negatives":ed_neg,"missing":[]},
            {"section_key":"certifications","section_label":"Certifications","score":ct_s,
             "summary":"Professional certifications and external learning credentials.",
             "positives":ct_pos,"negatives":[],"missing":[]},
            {"section_key":"resume_quality","section_label":"Resume Quality","score":qu_s,
             "summary":f"Profile completeness score: {pc:.0f}/100.",
             "positives":qu_pos,"negatives":qu_neg,"missing":[]},
            {"section_key":"trajectory","section_label":"Career Trajectory","score":tr_s,
             "summary":"Career seniority progression and role evolution analysis.",
             "positives":tr_pos,"negatives":[],"missing":[]},
            {"section_key":"impact_quality","section_label":"Impact Quality","score":im_s,
             "summary":"Quantified business impact, outcome metrics, and achievement quality.",
             "positives":im_pos,"negatives":im_neg,"missing":[]},
            {"section_key":"inferred_intent","section_label":"Inferred Intent","score":in_s,
             "summary":"Behavioral signals (response rate, notice, open-to-work) + semantic profile-role alignment.",
             "positives":in_pos,"negatives":[],"missing":[]},
            {"section_key":"overall_fit","section_label":"Overall Fit","score":ov_s,
             "summary":"Composite of 9 weighted dimensions blended with semantic JD similarity.",
             "positives":[f"Overall {compute_label(ov_s)} match for this position."],
             "negatives":[],"missing":[]},
        ],
    }


# ---------------------------------------------------------------------------
# Backward-compat alias used by resumes.py router
# ---------------------------------------------------------------------------

def analyze_resume_locally(raw_text: str, job_title: str, job_desc: str, job_reqs: str) -> dict:
    """Legacy alias — routes to analyze_from_text."""
    return analyze_from_text(raw_text, job_title, job_desc, job_reqs)
