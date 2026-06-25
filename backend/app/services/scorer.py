SECTION_WEIGHTS = {
    "work_experience": 0.20,
    "projects": 0.20,
    "skills": 0.15,
    "education": 0.08,
    "certifications": 0.05,
    "resume_quality": 0.05,
    "trajectory": 0.10,
    "impact_quality": 0.09,
    "inferred_intent": 0.05,
    "overall_fit": 0.03,
}

def compute_overall_score(sections: list[dict]) -> int:
    total = 0.0
    total_weight = 0.0

    for section in sections:
        key = section["section_key"]
        score = section["score"]
        weight = SECTION_WEIGHTS.get(key, 0)
        total += score * weight
        total_weight += weight

    if total_weight == 0:
        return 0

    return round(total / total_weight)


def compute_label(score: int) -> str:
    if score >= 81:
        return "Excellent"
    elif score >= 66:
        return "Strong"
    elif score >= 41:
        return "Average"
    else:
        return "Weak"