from fastapi import APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks, Response
from app.database import supabase
from app.models.schemas import ResumeResponse
from app.services.pdf_parser import extract_text_from_pdf
from app.pipeline.graph import pipeline
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Optional, cast, Any



router = APIRouter()

class BulkShortlistRequest(BaseModel):
    resume_ids: list[str]
    message: Optional[str] = None

class BulkRejectRequest(BaseModel):
    resume_ids: list[str]
    message: Optional[str] = None

class IndividualMessageRequest(BaseModel):
    message: str

def run_pipeline(resume_id: str, job_id: str, raw_text: str):
    try:
        pipeline.invoke({
            "resume_id": resume_id,
            "job_id": job_id,
            "raw_text": raw_text,
            "job_description": "",
            "job_requirements": "",
            "evaluator_sections": None,
            "profiler_sections": None,
            "scored_sections": None,
            "overall_score": None,
            "overall_summary": None,
            "error": None
        })
    except Exception as e:
        # Ensure the record is never left stuck in 'analyzing'
        print(f"[Pipeline Error] resume_id={resume_id}: {e}")
        supabase.table("resumes").update({"status": "failed"}).eq("id", resume_id).execute()


@router.post("/jobs/{job_id}/resumes")
async def upload_resume(
    job_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    candidate_name: str = Form(...),
    candidate_email: str = Form(...)
):
    
    job_response = supabase.table("jobs").select("application_deadline, is_active").eq("id", job_id).execute()
    
    if not job_response.data:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = cast(dict[str, Any], job_response.data[0])
    
    if not job.get("is_active"):
        raise HTTPException(status_code=400, detail="This job posting is closed")
    
    deadline = job.get("application_deadline")
    if isinstance(deadline, str):
        deadline_dt = datetime.fromisoformat(deadline.replace("Z", "+00:00"))
        if datetime.now(timezone.utc) > deadline_dt:
            raise HTTPException(status_code=400, detail="The application deadline for this job has passed")
    # validate file type
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    # read file bytes
    file_bytes = await file.read()

    # extract text
    raw_text = extract_text_from_pdf(file_bytes)
    if not raw_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from PDF")

    # upload file to supabase storage (upsert=true so re-applications overwrite existing file)
    file_path = f"{job_id}/{candidate_email}.pdf"
    try:
        supabase.storage.from_("resumes").upload(
            file_path, file_bytes,
            {"content-type": "application/pdf", "upsert": "true"}
        )
    except Exception as storage_err:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {storage_err}")
    file_url = supabase.storage.from_("resumes").get_public_url(file_path)

    # create resume row
    try:
        response = supabase.table("resumes").insert({
            "job_id": job_id,
            "candidate_name": candidate_name,
            "candidate_email": candidate_email,
            "file_url": file_url,
            "raw_text": raw_text,
            "status": "analyzing",
        }).execute()
    except Exception as db_err:
        raise HTTPException(status_code=500, detail=f"Failed to save resume record: {db_err}")

    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create resume record")

    resume = cast(dict[str, Any], response.data[0])

    # trigger pipeline in background
    background_tasks.add_task(run_pipeline, cast(str, resume.get("id")), job_id, raw_text)

    return {"resume_id": resume.get("id"), "status": "analyzing"}


@router.get("/resumes/{resume_id}")
def get_resume(resume_id: str):
    resume_response = supabase.table("resumes").select("*").eq("id", resume_id).execute()

    if not resume_response.data:
        raise HTTPException(status_code=404, detail="Resume not found")

    resume = cast(dict[str, Any], resume_response.data[0])

    sections_response = supabase.table("resume_sections").select("*").eq("resume_id", resume_id).order("display_order").execute()

    resume["sections"] = sections_response.data or []

    return resume


@router.get("/resumes/{resume_id}/status")
def get_resume_status(resume_id: str):
    response = supabase.table("resumes").select("status, overall_score, overall_summary").eq("id", resume_id).execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Resume not found")

    return response.data[0]


@router.get("/jobs/{job_id}/resumes")
def get_job_resumes(job_id: str):
    response = supabase.table("resumes").select("*").eq("job_id", job_id).order("overall_score", desc=True).execute()
    return response.data

@router.post("/resumes/bulk-shortlist")
def bulk_shortlist(payload: BulkShortlistRequest):
    supabase.table("resumes").update({
        "application_status": "shortlisted",
        "decided_at": datetime.now(timezone.utc).isoformat()
    }).in_("id", payload.resume_ids).execute()

    if payload.message:
        message_rows = [{"resume_id": rid, "message_body": payload.message} for rid in payload.resume_ids]
        supabase.table("messages").insert(message_rows).execute()

    return {"updated": len(payload.resume_ids)}


@router.post("/resumes/bulk-reject")
def bulk_reject(payload: BulkRejectRequest):
    supabase.table("resumes").update({
        "application_status": "rejected",
        "decided_at": datetime.now(timezone.utc).isoformat()
    }).in_("id", payload.resume_ids).execute()

    if payload.message:
        message_rows = [{"resume_id": rid, "message_body": payload.message} for rid in payload.resume_ids]
        supabase.table("messages").insert(message_rows).execute()

    return {"updated": len(payload.resume_ids)}

@router.post("/resumes/{resume_id}/message")
def send_message(resume_id: str, payload: IndividualMessageRequest):
    supabase.table("messages").insert({
        "resume_id": resume_id,
        "message_body": payload.message
    }).execute()
    return {"sent": True}

@router.get("/candidates/{email}/applications")
def get_candidate_applications(email: str):
    response = supabase.table("resumes").select(
        "id, job_id, overall_score, application_status, submitted_at, decided_at, jobs(title, location)"
    ).eq("candidate_email", email).order("submitted_at", desc=True).execute()
    
    if response.data:
        for app in response.data:
            app_dict = cast(dict[str, Any], app)
            msg_response = supabase.table("messages").select("*").eq("resume_id", app_dict.get("id")).order("sent_at", desc=True).execute()
            app_dict["messages"] = msg_response.data
    
    return response.data

@router.get("/resumes/{resume_id}/download")
def download_resume(resume_id: str):
    try:
        resume_response = supabase.table("resumes").select("job_id, candidate_email").eq("id", resume_id).execute()
        if not resume_response.data:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        resume = cast(dict[str, Any], resume_response.data[0])
        file_path = f"{resume.get('job_id')}/{resume.get('candidate_email')}.pdf"
        
        file_bytes = supabase.storage.from_("resumes").download(file_path)
        
        return Response(
            content=file_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={resume.get('candidate_email')}.pdf"
            }
        )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=f"Failed to download file: {str(e)}")