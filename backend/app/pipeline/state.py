from typing import TypedDict, Optional

class ResumeState(TypedDict):
    resume_id: str
    job_id: str
    raw_text: str
    job_description: str
    job_requirements: str
    evaluator_sections: Optional[list[dict]]   # GPT-style concrete scoring (still Gemini call)
    profiler_sections: Optional[list[dict]]    # hidden signal scoring
    scored_sections: Optional[list[dict]]      # combined final list
    overall_score: Optional[int]
    overall_summary: Optional[str]
    error: Optional[str]