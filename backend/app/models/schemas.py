from pydantic import BaseModel
from typing import Optional
from datetime import datetime

#Job Schemas

class JobCreate(BaseModel):
    title: str
    description: str
    requirements: str
    location: Optional[str] = None
    application_deadline: Optional[datetime] = None
    employment_type: Optional[str] = None
    department: Optional[str] = None

class JobResponse(BaseModel):
    id: str
    title: str
    description: str
    requirements: str
    location: Optional[str]
    application_deadline: Optional[datetime]
    employment_type: Optional[str]
    department: Optional[str]
    is_active: bool
    created_at: datetime
    applicant_count: Optional[int] = 0
    average_score: Optional[float] = 0.0

#Resume Schemas

class ResumeCreate(BaseModel):
    candidate_name: str
    candidate_email: str

class ResumeSection(BaseModel):
    id: str
    section_key: str
    section_label: str
    score: int
    label: str
    summary: str
    positives: list[str]
    negatives: list[str]
    missing: list[str]
    display_order: int

class ResumeResponse(BaseModel):
    id: str
    job_id: str
    candidate_name: str
    candidate_email: str
    file_url: Optional[str]
    overall_score: Optional[int]
    overall_summary: Optional[str]
    status: str
    application_status: Optional[str]
    submitted_at: datetime
    analyzed_at: Optional[datetime]
    decided_at: Optional[datetime]
    sections: Optional[list[ResumeSection]] = []