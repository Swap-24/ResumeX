from typing import TypedDict, Optional

class ResumeState(TypedDict):
    resume_id: str
    job_id: str
    raw_text: str
    job_description: str
    job_requirements: str
    scored_sections: Optional[list[dict]]
    overall_score: Optional[int]
    overall_summary: Optional[str]
    error: Optional[str]