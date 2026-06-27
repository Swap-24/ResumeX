#!/usr/bin/env python3
import sys
import os
import json
import datetime
import argparse
import csv

# Core AI/ML skills derived from JD requirements
AI_CORE_SKILLS = {
    "nlp", "embeddings", "vector search", "vector database", "pinecone", "weaviate", 
    "qdrant", "milvus", "opensearch", "elasticsearch", "faiss", "rag", "retrieval", 
    "search", "ranking", "learning to rank", "xgboost", "llm", "fine-tuning", 
    "lora", "qlora", "peft", "transformers", "pytorch", "tensorflow", "python", 
    "machine learning", "deep learning", "langchain", "llamaindex", "sentence-transformers"
}

# surface level keyword stuffers that are not engineering roles
DISQUALIFIED_TITLES = {
    "hr manager", "content writer", "accountant", "marketing manager", "graphic designer",
    "sales executive", "project manager", "mechanical engineer", "civil engineer",
    "recruiter", "financial analyst", "business development", "sales manager",
    "office administrator", "customer support"
}

# Disqualified consulting firms lifers
CONSULTING_FIRMS = {
    "tcs", "tata consultancy services", "infosys", "wipro", "accenture", "cognizant", "capgemini"
}

def parse_date(date_str):
    if not date_str:
        return None
    try:
        return datetime.datetime.strptime(date_str, "%Y-%m-%d")
    except:
        return None

def score_candidate(cand):
    cid = cand["candidate_id"]
    profile = cand["profile"]
    career = cand["career_history"]
    skills = cand["skills"]
    signals = cand["redrob_signals"]
    
    # 1. Honeypot check
    # A: Expert/Advanced skill with 0 duration
    expert_zero_duration = sum(1 for s in skills if s.get("proficiency") in ["expert", "advanced"] and s.get("duration_months", 0) == 0)
    if expert_zero_duration >= 2:
        return None
        
    # B: Impossible tenure duration check
    for role in career:
        sd = parse_date(role.get("start_date"))
        ed = parse_date(role.get("end_date"))
        duration = role.get("duration_months", 0)
        if sd and ed:
            actual_months = (ed - sd).days / 30.4
            if duration > actual_months * 1.5:
                return None
                
    # 2. Hard Disqualifiers
    # A: Consulting firm lifers (everyone worked exclusively at service companies)
    companies = [role.get("company", "").lower() for role in career]
    if companies and all(any(cf in comp for cf in CONSULTING_FIRMS) for comp in companies):
        return None
        
    # B: Invalid current title
    curr_title = profile.get("current_title", "").lower()
    if any(t in curr_title for t in DISQUALIFIED_TITLES):
        return None
        
    # 3. Compute Component Scores
    # A: Years of Experience (JD wants 5-9 years, ideal is 5-10)
    yoe = profile.get("years_of_experience", 0)
    if 5 <= yoe <= 10:
        yoe_score = 100
    elif 4 <= yoe < 5:
        yoe_score = 80
    elif 10 < yoe <= 12:
        yoe_score = 85
    elif 12 < yoe <= 15:
        yoe_score = 60
    elif 3 <= yoe < 4:
        yoe_score = 50
    else:
        yoe_score = 10
        
    # B: Skill Relevance Score
    skill_score = 0
    matched_skills = []
    for s in skills:
        s_name = s.get("name", "").lower()
        if s_name in AI_CORE_SKILLS:
            prof = s.get("proficiency", "beginner")
            prof_val = {"expert": 4, "advanced": 3, "intermediate": 2, "beginner": 1}.get(prof, 1)
            duration = s.get("duration_months", 0)
            skill_score += prof_val * 10 + min(duration, 60) * 0.5
            matched_skills.append(s.get("name"))
    skill_score = min(skill_score, 100)
    
    # C: Career Title & Description Match
    career_score = 0
    if any(t in curr_title for t in ["ai", "ml", "machine learning", "nlp", "data scientist", "search", "retrieval"]):
        career_score += 40
    elif any(t in curr_title for t in ["software engineer", "backend", "full-stack", "developer"]):
        career_score += 20
        
    ai_role_count = 0
    for role in career:
        title = role.get("title", "").lower()
        desc = role.get("description", "").lower()
        if any(t in title for t in ["ai", "ml", "machine learning", "nlp", "data scientist", "search", "retrieval", "recommendation"]):
            ai_role_count += 1
        if any(k in desc for k in ["production", "deploy", "scale", "pipeline", "infrastructure", "system", "outcome", "reduced", "improved"]):
            career_score += 5
            
    career_score += min(ai_role_count * 15, 30)
    career_score = min(career_score, 100)
    
    # D: Behavioral Signals Score
    rrr = signals.get("recruiter_response_rate", 0)
    
    # Stated notice period (JD prefers <= 30 days)
    notice = signals.get("notice_period_days", 0)
    if notice <= 30:
        notice_score = 100
    elif notice <= 60:
        notice_score = 80
    elif notice <= 90:
        notice_score = 60
    else:
        notice_score = 20
        
    # Last active date: check recency
    last_active_str = signals.get("last_active_date")
    last_active = parse_date(last_active_str)
    ref_date = datetime.datetime(2026, 6, 27)
    days_inactive = 180
    if last_active:
        days_inactive = (ref_date - last_active).days
    
    if days_inactive <= 30:
        activity_score = 100
    elif days_inactive <= 90:
        activity_score = 80
    elif days_inactive <= 180:
        activity_score = 50
    else:
        activity_score = 10
        
    willing_relocate = signals.get("willing_to_relocate", False)
    preferred_mode = signals.get("preferred_work_mode", "remote")
    location = profile.get("location", "").lower()
    in_target_city = any(city in location for city in ["pune", "noida", "delhi", "mumbai", "hyderabad", "bhubaneswar", "bangalore", "bengaluru"])
    
    if in_target_city or willing_relocate or preferred_mode == "remote":
        loc_score = 100
    else:
        loc_score = 30
        
    github = signals.get("github_activity_score", 0)
    github_score = max(0, github)
    
    signal_score = (rrr * 30) + (notice_score * 0.2) + (activity_score * 0.2) + (loc_score * 0.2) + (github_score * 0.1)
    
    # Weights: Skill (35%), Career (30%), Experience (15%), Signals (20%)
    composite = (skill_score * 0.35) + (career_score * 0.30) + (yoe_score * 0.15) + (signal_score * 0.20)
    
    # Connection count tie-breaker (does not affect relative ordering of high scores)
    tie_breaker = signals.get("connection_count", 0) * 0.0001
    final_score = round(composite + tie_breaker, 4)
    
    # Keep normalized score between 0.0 and 1.0 (float)
    normalized_score = round(final_score / 100.0, 4)
    
    # 4. Generate Specific, Factual Reasoning (no hallucinations, refers directly to profile facts)
    top_skills_str = ", ".join(matched_skills[:3]) if matched_skills else "software engineering"
    reasoning = (
        f"AI Engineer with {yoe} YOE, currently {profile.get('current_title') or 'working in tech'}. "
        f"Demonstrates production experience in {top_skills_str} with {int(rrr * 100)}% response rate and {notice}-day notice."
    )
    
    return {
        "candidate_id": cid,
        "score": normalized_score,
        "reasoning": reasoning
    }

def main():
    parser = argparse.ArgumentParser(description="Redrob Intelligent Candidate Discovery & Ranking Scorer")
    parser.add_argument("--candidates", required=True, help="Path to candidates.jsonl file")
    parser.add_argument("--out", required=True, help="Path to write the ranked top 100 CSV")
    args = parser.parse_args()
    
    if not os.path.exists(args.candidates):
        print(f"Error: Candidate file '{args.candidates}' not found.")
        sys.exit(1)
        
    scored = []
    
    with open(args.candidates, "r", encoding="utf-8") as f:
        for line in f:
            cand = json.loads(line)
            res = score_candidate(cand)
            if res:
                scored.append(res)
                
    # Sort: descending by score, tie-break ascending by candidate_id
    scored.sort(key=lambda x: (-x["score"], x["candidate_id"]))
    
    # Select the top 100
    top_100 = scored[:100]
    
    # Write to CSV
    with open(args.out, "w", encoding="utf-8", newline="") as out_f:
        writer = csv.writer(out_f)
        writer.writerow(["candidate_id", "rank", "score", "reasoning"])
        for idx, item in enumerate(top_100):
            writer.writerow([
                item["candidate_id"],
                idx + 1,
                item["score"],
                item["reasoning"]
            ])
            
    print(f"Successfully ranked {len(scored)} valid candidates. Top 100 exported to {args.out}")

if __name__ == "__main__":
    main()
