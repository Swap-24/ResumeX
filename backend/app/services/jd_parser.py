"""
JD Parser — Extracts structured requirements from free-text job descriptions.
"""
from __future__ import annotations
import re
from app.services.skill_taxonomy import extract_skills_from_text

def extract_experience_range(jd_text: str, title: str = "") -> tuple[float, float]:
    """
    Parse YOE range from JD text. Returns (min_yoe, max_yoe).
    Handles: "5-9 years", "5+ years", "at least 5 years", "minimum 5 years"
    """
    text = jd_text.lower()
    # "5-9 years" or "5 to 9 years"
    m = re.search(r'(\d+(?:\.\d+)?)\s*[-\u2013to]+\s*(\d+(?:\.\d+)?)\s*(?:years?|yrs?|yoe)', text)
    if m:
        return float(m.group(1)), float(m.group(2))
    # "at least 5 years" / "minimum 5 years"
    m = re.search(r'(?:at least|minimum|min|>=?\s*)(\d+(?:\.\d+)?)\s*(?:\+\s*)?(?:years?|yrs?|yoe)', text)
    if m:
        v = float(m.group(1)); return v, v + 5.0
    # "5+ years"
    m = re.search(r'(\d+(?:\.\d+)?)\s*\+\s*(?:years?|yrs?|yoe)', text)
    if m:
        v = float(m.group(1)); return v, v + 5.0
    # Single number: "5 years"
    m = re.search(r'(\d+(?:\.\d+)?)\s*(?:years?|yrs?|yoe)', text)
    if m:
        v = float(m.group(1)); return max(v - 2, 0), v + 3

    # Dynamic fallback based on job title
    title_lower = title.lower()
    if any(k in title_lower for k in ["senior", "lead", "principal", "staff", "architect", "manager", "head", "director"]):
        return 5.0, 10.0
    if any(k in title_lower for k in ["junior", "associate", "entry", "intern", "fresher"]):
        return 0.0, 3.0
    return 1.0, 6.0  # general mid-level default

def extract_required_skills(jd_text: str) -> list[str]:
    """Extract skill requirements from JD using the skill taxonomy."""
    return extract_skills_from_text(jd_text)

def extract_location_prefs(jd_text: str) -> dict:
    """Extract work location and mode preferences from JD."""
    text = jd_text.lower()
    cities = [c for c in ["bangalore", "bengaluru", "mumbai", "delhi", "hyderabad",
                           "pune", "noida", "chennai", "gurgaon", "gurugram",
                           "kolkata", "ahmedabad", "remote"] if c in text]
    work_mode = "any"
    if "remote" in text and "onsite" not in text and "hybrid" not in text:
        work_mode = "remote"
    elif "hybrid" in text:
        work_mode = "hybrid"
    elif "onsite" in text or "in-office" in text:
        work_mode = "onsite"
    return {"cities": cities, "work_mode": work_mode}

def parse_jd(title: str, desc: str, reqs: str) -> dict:
    """Full JD parse. Returns dict with min_exp, max_exp, required_skills, location."""
    full_text = f"{title}\n{desc}\n{reqs}"
    min_exp, max_exp = extract_experience_range(reqs or desc, title=title)
    return {
        "min_exp": min_exp,
        "max_exp": max_exp,
        "required_skills": extract_required_skills(full_text),
        "location": extract_location_prefs(full_text),
    }
