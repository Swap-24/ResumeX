from fastapi import APIRouter, HTTPException
from app.models.schemas import JobCreate, JobResponse
from app.database import supabase
from typing import cast, Any

router = APIRouter()

@router.post("/", response_model=JobResponse)
def create_job(job: JobCreate):
    response = supabase.table("jobs").insert({
        "title": job.title,
        "description": job.description,
        "requirements": job.requirements,
        "location": job.location,
        "application_deadline": job.application_deadline.isoformat() if job.application_deadline else None,
        "employment_type": job.employment_type,
        "department": job.department,
        "is_active": True
    }).execute()

    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create job")

    job_data = cast(dict[str, Any], response.data[0])
    job_data["applicant_count"] = 0
    return job_data



@router.get("/", response_model=list[JobResponse])
def get_jobs():
    response = supabase.table("jobs").select("*, resumes(overall_score)").eq("is_active", True).order("created_at", desc=True).execute()
    
    jobs = []
    if response.data:
        for job in response.data:
            job_dict = cast(dict[str, Any], job)
            resumes_list = job_dict.get("resumes")
            
            applicant_count = 0
            average_score = 0.0
            
            if isinstance(resumes_list, list) and resumes_list:
                applicant_count = len(resumes_list)
                valid_scores: list[int] = []
                for r in resumes_list:
                    if isinstance(r, dict):
                        score = r.get("overall_score")
                        if score is not None:
                            valid_scores.append(int(score))
                if valid_scores:
                    average_score = sum(valid_scores) / len(valid_scores)
            
            job_dict["applicant_count"] = applicant_count
            job_dict["average_score"] = round(average_score, 1)
            
            if "resumes" in job_dict:
                del job_dict["resumes"]
            jobs.append(job_dict)
    
    return jobs


@router.put("/{job_id}", response_model = JobResponse)            #update a particular job endpoint
def update_job(job_id: str, job: JobCreate):
    response = (supabase.table("jobs")
                .update({
                    "title": job.title,
                    "description": job.description,
                    "requirements": job.requirements
                })
                .eq("id", job_id)
                .execute())
    if not response.data:
        raise HTTPException(
            status_code = 404,
            detail = "The job you're trying to update does not exist or cannot be found"
        )
    return response.data[0]


@router.delete("/{job_id}")                                        #delete a particular job endpoint (soft delete by setting is_active to False)
def delete_job(job_id: str):
    response = supabase.table("jobs").update({"is_active": False}).eq("id", job_id).execute()

    if not response.data:
        raise HTTPException(
            status_code=404,
            detail="The job you're trying to delete does not exist or cannot be found")

    return {"message": "Job deleted successfully"}
    