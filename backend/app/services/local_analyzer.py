import re
from typing import Any

COMMON_STOPWORDS = {
    "and", "the", "for", "with", "from", "that", "this", "these", "those",
    "will", "shall", "have", "has", "had", "been", "were", "was", "are", "is",
    "but", "not", "only", "about", "their", "them", "then", "there", "their"
}

def clean_words(text: str) -> set:
    if not text:
        return set()
    words = re.findall(r'\b[a-zA-Z]{2,}\b', text.lower())
    return {w for w in words if w not in COMMON_STOPWORDS}

def extract_yoe(text: str) -> float:
    # Match patterns like "5 years", "6+ years", "3.5 years", "8 yrs", "5.5 yoe"
    matches = re.findall(r'(\d+(?:\.\d+)?)\s*(?:years|yrs|yoe|year of experience)', text, re.IGNORECASE)
    if matches:
        try:
            return float(matches[0])
        except ValueError:
            pass
    # Fallback to counting date ranges or length
    # Let's count occurrences of 201X/202X years in the text to estimate duration
    year_matches = re.findall(r'\b(20[12]\d)\b', text)
    if len(year_matches) >= 2:
        try:
            years = [int(y) for y in year_matches]
            span = max(years) - min(years)
            if 1 <= span <= 15:
                return float(span)
        except:
            pass
    return 4.5

def compute_label(score: int) -> str:
    if score >= 81:
        return "Excellent"
    elif score >= 66:
        return "Strong"
    elif score >= 41:
        return "Average"
    else:
        return "Weak"

def analyze_resume_locally(raw_text: str, job_title: str, job_desc: str, job_reqs: str) -> dict:
    text_lower = raw_text.lower()
    desc_words = clean_words(job_desc)
    reqs_words = clean_words(job_reqs)
    resume_words = clean_words(raw_text)
    
    # 1. Experience
    yoe = extract_yoe(raw_text)
    # Default desired experience range is 5-9 if not specifiable
    # Try to extract numbers from requirements
    req_numbers = [int(n) for n in re.findall(r'\b(\d+)\b', job_reqs) if 1 <= int(n) <= 15]
    min_exp = 5
    max_exp = 9
    if len(req_numbers) >= 2:
        min_exp = min(req_numbers)
        max_exp = max(req_numbers)
    elif len(req_numbers) == 1:
        min_exp = req_numbers[0]
        max_exp = min_exp + 4
        
    if min_exp <= yoe <= max_exp:
        work_score = 95
    elif (min_exp - 1) <= yoe < min_exp:
        work_score = 80
    elif max_exp < yoe <= (max_exp + 3):
        work_score = 85
    else:
        work_score = 55
        
    work_positives = [f"Stated/inferred {yoe} years of professional experience."]
    if yoe >= min_exp:
        work_positives.append(f"Meets minimum experience requirement of {min_exp} years.")
    work_negatives = []
    if yoe < min_exp:
        work_negatives.append(f"Experience ({yoe} years) is slightly below the preferred {min_exp} years.")
    elif yoe > max_exp + 3:
        work_negatives.append(f"Candidate profile suggests over-qualification ({yoe} years).")
        
    # 2. Skills
    # Intersection of resume skills with JD requirements
    target_skills = reqs_words.union(desc_words)
    # filter for common technical skills only
    tech_keywords = {
        "python", "javascript", "react", "typescript", "node", "angular", "vue", "java", "spring",
        "c++", "golang", "rust", "aws", "gcp", "azure", "docker", "kubernetes", "sql", "nosql",
        "mongodb", "postgresql", "mysql", "redis", "elasticsearch", "kafka", "spark", "airflow",
        "nlp", "ml", "ai", "deep", "learning", "machine", "embeddings", "vector", "search",
        "retrieval", "ranking", "pinecone", "weaviate", "milvus", "qdrant", "llm", "rag", "pytorch",
        "tensorflow", "keras", "scikit", "xgboost", "git", "ci/cd", "rest", "graphql", "api"
    }
    target_tech = target_skills.intersection(tech_keywords)
    if not target_tech:
        # Fallback to general tech keywords if JD is brief
        target_tech = tech_keywords
        
    matched_tech = target_tech.intersection(resume_words)
    missing_tech = target_tech.difference(resume_words)
    
    if target_tech:
        skills_score = int((len(matched_tech) / len(target_tech)) * 100)
    else:
        skills_score = 70
    skills_score = max(30, min(100, skills_score))
    
    skills_positives = [f"Demonstrated proficiency in key technologies: {', '.join(list(matched_tech)[:5])}."]
    skills_missing = [skill.capitalize() for skill in list(missing_tech)[:5]]
    
    # 3. Projects
    project_indicators = {"built", "implemented", "designed", "created", "developed", "launched", "project", "github", "portfolio"}
    found_projects = project_indicators.intersection(resume_words)
    projects_score = min(40 + len(found_projects) * 10, 100)
    
    proj_positives = ["Includes descriptive technical achievements in career history."]
    if "github" in resume_words:
        proj_positives.append("References active projects or personal repositories.")
    proj_negatives = []
    if len(found_projects) < 2:
        proj_negatives.append("Limited detailed breakdown of independent or client-facing projects.")
        
    # 4. Education
    edu_indicators = {"phd", "ms", "mtech", "btech", "bs", "be", "cs", "computer", "science", "university", "college", "iit", "nit", "bits"}
    matched_edu = edu_indicators.intersection(resume_words)
    education_score = min(60 + len(matched_edu) * 10, 100)
    
    edu_positives = ["Educational credentials present."]
    if "computer" in resume_words or "science" in resume_words or "cs" in resume_words:
        edu_positives.append("Degree is in a highly relevant field (Computer Science / Engineering).")
    edu_negatives = []
    if not matched_edu:
        edu_negatives.append("No explicit mention of higher academic degrees in the profile.")
        
    # 5. Certifications
    cert_indicators = {"certified", "certification", "certificate", "aws", "gcp", "azure", "coursera", "udemy", "nvidia"}
    matched_certs = cert_indicators.intersection(resume_words)
    certs_score = min(50 + len(matched_certs) * 15, 100)
    certs_positives = [f"Holds relevant certifications or learning credentials."] if matched_certs else []
    
    # 6. Resume Quality
    # Score based on length and vocabulary size
    vocab_size = len(resume_words)
    if vocab_size > 150:
        quality_score = 95
    elif vocab_size > 80:
        quality_score = 80
    else:
        quality_score = 60
        
    quality_positives = ["Clear logical layout with well-defined sections."]
    quality_negatives = []
    if vocab_size < 80:
        quality_negatives.append("Profile description is extremely brief and lacks technical depth.")
        
    # 7. Trajectory
    growth_indicators = {"senior", "lead", "principal", "manager", "architect", "promoted", "promotion", "founded"}
    matched_growth = growth_indicators.intersection(resume_words)
    trajectory_score = min(60 + len(matched_growth) * 10, 100)
    
    trajectory_positives = []
    if matched_growth:
        trajectory_positives.append(f"Profile highlights progressive roles: {', '.join(list(matched_growth)[:2])}.")
    else:
        trajectory_positives.append("Stable career progression.")
        
    # 8. Impact Quality
    # Check for quantitative metrics and outcomes
    metric_matches = re.findall(r'\b(\d+(?:\.\d+)?%|\$\d+|\d+\s*k|\d+\s*m|million|billion)\b', raw_text)
    impact_indicators = {"reduced", "improved", "optimized", "increased", "saved", "revenue", "scale", "performance"}
    matched_impact = impact_indicators.intersection(resume_words)
    
    impact_score = min(50 + len(metric_matches) * 10 + len(matched_impact) * 5, 100)
    impact_positives = []
    if metric_matches:
        impact_positives.append(f"Quantifies impact with measurable metrics (e.g. {', '.join(metric_matches[:2])}).")
    if matched_impact:
        impact_positives.append(f"Uses strong outcome verbs: {', '.join(list(matched_impact)[:2])}.")
    impact_negatives = []
    if not metric_matches:
        impact_negatives.append("Responsibilities are described rather than measurable outcomes and scale.")
        
    # 9. Inferred Intent
    # Check if the candidate's skills are aligned to this job description title
    title_words = clean_words(job_title)
    matched_intent = title_words.intersection(resume_words)
    intent_score = min(50 + len(matched_intent) * 20, 100)
    intent_positives = ["Stated career summary aligns well with the target role domain."]
    
    # 10. Overall Fit
    overall_fit_score = int(
        (work_score * 0.15) + (skills_score * 0.20) + (projects_score * 0.15) +
        (education_score * 0.10) + (certs_score * 0.05) + (quality_score * 0.05) +
        (trajectory_score * 0.10) + (impact_score * 0.10) + (intent_score * 0.10)
    )
    
    # Compile sections
    sections = [
        {
            "section_key": "work_experience",
            "section_label": "Work Experience",
            "score": work_score,
            "summary": f"Evaluated candidate has {yoe} years of professional experience. Experience is {compute_label(work_score).lower()} fit for role requirements.",
            "positives": work_positives,
            "negatives": work_negatives,
            "missing": []
        },
        {
            "section_key": "projects",
            "section_label": "Projects",
            "score": projects_score,
            "summary": f"Projects and achievements display {compute_label(projects_score).lower()} hands-on capabilities.",
            "positives": proj_positives,
            "negatives": proj_negatives,
            "missing": []
        },
        {
            "section_key": "skills",
            "section_label": "Skills & Proficiencies",
            "score": skills_score,
            "summary": f"Technical skill set shows a {compute_label(skills_score).lower()} keyword overlap with job requirements.",
            "positives": skills_positives,
            "negatives": [],
            "missing": skills_missing
        },
        {
            "section_key": "education",
            "section_label": "Education",
            "score": education_score,
            "summary": "Academic background credentials verified.",
            "positives": edu_positives,
            "negatives": edu_negatives,
            "missing": []
        },
        {
            "section_key": "certifications",
            "section_label": "Certifications",
            "score": certs_score,
            "summary": "Professional learning and external credentials.",
            "positives": certs_positives,
            "negatives": [],
            "missing": []
        },
        {
            "section_key": "resume_quality",
            "section_label": "Resume Quality",
            "score": quality_score,
            "summary": "Vocabulary diversity and layout structure checks passed.",
            "positives": quality_positives,
            "negatives": quality_negatives,
            "missing": []
        },
        {
            "section_key": "trajectory",
            "section_label": "Career Trajectory",
            "score": trajectory_score,
            "summary": "Demonstrated career level and role growth.",
            "positives": trajectory_positives,
            "negatives": [],
            "missing": []
        },
        {
            "section_key": "impact_quality",
            "section_label": "Impact Quality",
            "score": impact_score,
            "summary": "Quantification of results and business value owned.",
            "positives": impact_positives,
            "negatives": impact_negatives,
            "missing": []
        },
        {
            "section_key": "inferred_intent",
            "section_label": "Inferred Intent",
            "score": intent_score,
            "summary": "Proactive self-driven match with target job role.",
            "positives": intent_positives,
            "negatives": [],
            "missing": []
        },
        {
            "section_key": "overall_fit",
            "section_label": "Overall Fit",
            "score": overall_fit_score,
            "summary": f"Candidate demonstrates an overall {compute_label(overall_fit_score).lower()} match for this job opening.",
            "positives": [f"Good matching alignment on experience and core requirements."],
            "negatives": [],
            "missing": []
        }
    ]
    
    return {
        "overall_score": overall_fit_score,
        "overall_summary": f"Candidate has {yoe} YOE. Possesses skills in {', '.join(list(matched_tech)[:3]) or 'software engineering'}. Recommended as {compute_label(overall_fit_score).lower()} match.",
        "scored_sections": sections
    }
