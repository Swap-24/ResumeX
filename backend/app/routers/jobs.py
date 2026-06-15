from fastapi import APIRouter, HTTPException
from app.models.schemas import JobCreate, JobResponse
from app.database import supabase

router = APIRouter()

@router.post("/", response_model = JobResponse)                     #job insertion endpoint
def create_job(job: JobCreate):
    response = supabase.table("jobs").insert({
        "title": job.title,
        "description": job.description,
        "requirements": job.requirements
    }).execute()

    if not response.data:
        raise HTTPException(
            status_code = 500,
            detail = "Error in inserting job into database" 
        )
    return response.data[0]


@router.get("/", response_model = list[JobResponse])                  #get all jobs endpoint
def get_jobs():
    response = (supabase.table("jobs")
    .select("*")
    .eq("is_active", True)
    .order("created_at", desc = True)
    .execute()
    )

    return response.data


@router.get("/{job_id}", response_model = JobResponse)             #get a particular job endpoint
def get_job(job_id: str):
    response = (supabase.table("jobs")
                .select("*")
                .eq("id", job_id)
                .execute())
    if not response.data:
        raise HTTPException(
            status_code = 404,
            detail = "The job you're looking for does not exist or cannot be found"
        )
    return response.data[0]


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
    