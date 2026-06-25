from fastapi import APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks
from app.database import supabase
from app.models.schemas import ResumeResponse
from app.services.pdf_parser import extract_text_from_pdf
from app.pipeline.graph import pipeline

router = APIRouter()


def run_pipeline(resume_id: str, job_id: str, raw_text: str):
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


@router.post("/jobs/{job_id}/resumes")
async def upload_resume(
    job_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    candidate_name: str = Form(...),
    candidate_email: str = Form(...)
):
    # validate file type
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    # read file bytes
    file_bytes = await file.read()

    # extract text
    raw_text = extract_text_from_pdf(file_bytes)
    if not raw_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from PDF")

    # upload file to supabase storage
    file_path = f"{job_id}/{candidate_email}.pdf"
    supabase.storage.from_("resumes").upload(file_path, file_bytes, {"content-type": "application/pdf"})
    file_url = supabase.storage.from_("resumes").get_public_url(file_path)

    # create resume row
    response = supabase.table("resumes").insert({
        "job_id": job_id,
        "candidate_name": candidate_name,
        "candidate_email": candidate_email,
        "file_url": file_url,
        "raw_text": raw_text,
        "status": "analyzing"
    }).execute()

    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create resume record")

    resume = response.data[0]

    # trigger pipeline in background
    background_tasks.add_task(run_pipeline, resume["id"], job_id, raw_text)

    return {"resume_id": resume["id"], "status": "analyzing"}


@router.get("/resumes/{resume_id}")
def get_resume(resume_id: str):
    resume_response = supabase.table("resumes").select("*").eq("id", resume_id).execute()

    if not resume_response.data:
        raise HTTPException(status_code=404, detail="Resume not found")

    resume = resume_response.data[0]

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

