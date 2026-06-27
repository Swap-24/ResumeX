from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
import re
from app.services.pdf_parser import extract_text_from_pdf
from app.models.schemas import JobCreate, JobResponse
from app.database import supabase
from app.auth import get_current_user, get_optional_user, AuthUser
from typing import cast, Any, Optional

router = APIRouter()


def _enrich_jobs(raw_jobs: list[dict]) -> list[dict]:
    """
    Enriches a list of raw job rows with applicant_count and average_score.
    Removes the nested 'resumes' key Supabase returns from the join.
    """
    jobs = []
    for job in raw_jobs:
        job_dict = cast(dict[str, Any], job)
        resumes_list = job_dict.pop("resumes", None)

        applicant_count = 0
        average_score = 0.0

        if isinstance(resumes_list, list) and resumes_list:
            applicant_count = len(resumes_list)
            valid_scores: list[int] = [
                int(r["overall_score"])
                for r in resumes_list
                if isinstance(r, dict) and r.get("overall_score") is not None
            ]
            if valid_scores:
                average_score = sum(valid_scores) / len(valid_scores)

        job_dict["applicant_count"] = applicant_count
        job_dict["average_score"] = round(average_score, 1)

        # Pull company_name from nested profiles join (if present)
        profile = job_dict.pop("profiles", None)
        if isinstance(profile, dict):
            job_dict["company_name"] = profile.get("display_name")
        else:
            job_dict["company_name"] = None

        jobs.append(job_dict)
    return jobs


@router.post("/", response_model=JobResponse)
def create_job(job: JobCreate, user: AuthUser = Depends(get_current_user)):
    """Create a job listing. Requires company role auth."""
    if user.role != "company":
        raise HTTPException(status_code=403, detail="Only company accounts can create job listings")

    response = supabase.table("jobs").insert({
        "title": job.title,
        "description": job.description,
        "requirements": job.requirements,
        "location": job.location,
        "application_deadline": job.application_deadline.isoformat() if job.application_deadline else None,
        "employment_type": job.employment_type,
        "department": job.department,
        "is_active": True,
        "company_id": user.id,
        "default_shortlist_message": job.default_shortlist_message,
        "default_rejection_message": job.default_rejection_message,
    }).execute()

    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create job")

    job_data = cast(dict[str, Any], response.data[0])
    job_data["applicant_count"] = 0
    job_data["average_score"] = 0.0
    job_data["company_name"] = user.display_name
    return job_data


@router.get("/", response_model=list[JobResponse])
def get_jobs(
    mine: Optional[bool] = False,
    user: AuthUser | None = Depends(get_optional_user),
):
    """
    Public endpoint — returns all active jobs with company name.
    If `mine=true` is passed (and user is authenticated as company),
    returns only that company's jobs.
    """
    query = (
        supabase.table("jobs")
        .select("*, resumes(overall_score), profiles(display_name)")
        .eq("is_active", True)
        .order("created_at", desc=True)
    )

    if mine and user and user.role == "company":
        query = query.eq("company_id", user.id)

    response = query.execute()
    raw = cast(list[dict[str, Any]], response.data or [])
    return _enrich_jobs(raw)


@router.put("/{job_id}", response_model=JobResponse)
def update_job(job_id: str, job: JobCreate, user: AuthUser = Depends(get_current_user)):
    """Update a job listing. Requires ownership."""
    # Ownership check
    existing = supabase.table("jobs").select("company_id").eq("id", job_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Job not found")

    owner_id = cast(dict[str, Any], existing.data[0]).get("company_id")
    if owner_id != user.id:
        raise HTTPException(status_code=403, detail="You do not own this job listing")

    response = (
        supabase.table("jobs")
        .update({
            "title": job.title,
            "description": job.description,
            "requirements": job.requirements,
            "location": job.location,
            "employment_type": job.employment_type,
            "department": job.department,
            "application_deadline": job.application_deadline.isoformat() if job.application_deadline else None,
            "default_shortlist_message": job.default_shortlist_message,
            "default_rejection_message": job.default_rejection_message,
        })
        .eq("id", job_id)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Job not found or update failed")

    job_data = cast(dict[str, Any], response.data[0])
    job_data.setdefault("applicant_count", 0)
    job_data.setdefault("average_score", 0.0)
    job_data.setdefault("company_name", user.display_name)
    return job_data


@router.delete("/{job_id}")
def delete_job(job_id: str, user: AuthUser = Depends(get_current_user)):
    """Soft-delete a job listing. Requires ownership."""
    existing = supabase.table("jobs").select("company_id").eq("id", job_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Job not found")

    owner_id = cast(dict[str, Any], existing.data[0]).get("company_id")
    if owner_id != user.id:
        raise HTTPException(status_code=403, detail="You do not own this job listing")

    response = supabase.table("jobs").update({"is_active": False}).eq("id", job_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Job not found")

    return {"message": "Job deleted successfully"}


@router.post("/parse-jd")
async def parse_jd_pdf(file: UploadFile = File(...), user: AuthUser = Depends(get_current_user)):
    """Extract title, description, and requirements from a JD PDF file."""
    if user.role != "company":
        raise HTTPException(status_code=403, detail="Only company accounts can parse JDs")

    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    try:
        file_bytes = await file.read()
        raw_text = extract_text_from_pdf(file_bytes)
        if not raw_text.strip():
            raise Exception("No text found in PDF")
            
        lines = [l.strip() for l in raw_text.split("\n") if l.strip()]
        title = lines[0] if lines and len(lines[0]) < 60 else ""
        
        headers = [
            r'\b(?:key\s+)?requirements\b',
            r'\bqualifications\b',
            r'\bwhat\s+you\s+(?:need|will\s+need|should\s+have)\b',
            r'\brequired\s+(?:skills|experience)\b',
            r'\bwho\s+you\s+are\b',
            r'\bwhat\s+we\s+look\s+for\b',
        ]
        earliest_idx = -1
        for h in headers:
            m = re.search(h, raw_text, re.IGNORECASE)
            if m:
                if earliest_idx == -1 or m.start() < earliest_idx:
                    earliest_idx = m.start()
                    
        if earliest_idx != -1:
            desc = raw_text[:earliest_idx].strip()
            reqs = raw_text[earliest_idx:].strip()
        else:
            split_point = int(len(raw_text) * 0.6)
            desc = raw_text[:split_point].strip()
            reqs = raw_text[split_point:].strip()

        return {
            "title": title,
            "description": desc,
            "requirements": reqs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse JD PDF: {str(e)}")