from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query, BackgroundTasks, Response
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


class ExportWeightsRequest(BaseModel):
    work_experience: int
    projects: int
    skills: int
    education: int
    certifications: int
    resume_quality: int
    trajectory: int
    impact_quality: int
    inferred_intent: int

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
        supabase.table("resumes").update({
            "status": "failed",
            "overall_summary": f"Runtime Exception: {str(e)}"
        }).eq("id", resume_id).execute()


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


@router.post("/resumes/{resume_id}/retry")
def retry_resume_analysis(
    resume_id: str,
    background_tasks: BackgroundTasks,
):
    """Manually triggers resume re-analysis for failed candidates."""
    res = supabase.table("resumes").select("id, job_id, raw_text, status").eq("id", resume_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Resume not found")

    resume = cast(dict[str, Any], res.data[0])
    if resume.get("status") != "failed":
        raise HTTPException(status_code=400, detail="Only failed resume analyses can be retried")

    # Reset state to analyzing and clear overall_summary (error msg)
    supabase.table("resumes").update({
        "status": "analyzing",
        "overall_summary": None,
        "overall_score": None
    }).eq("id", resume_id).execute()

    # Clear any old sections
    supabase.table("resume_sections").delete().eq("resume_id", resume_id).execute()

    # Trigger graph in background
    background_tasks.add_task(
        run_pipeline,
        resume_id,
        cast(str, resume.get("job_id")),
        cast(str, resume.get("raw_text"))
    )

    return {"message": "Re-analysis triggered successfully"}


@router.get("/jobs/{job_id}/resumes")
def get_job_resumes(job_id: str):
    response = supabase.table("resumes").select("*, resume_sections(*)").eq("job_id", job_id).order("overall_score", desc=True).execute()
    return response.data


DEFAULT_WEIGHTS = {
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

def get_mapped_weight(key: str, val: int) -> float:
    percent = val / 100.0
    if key == 'work_experience':
        return 0.02 + (percent * 0.48)
    elif key == 'projects':
        return 0.02 + (percent * 0.48)
    elif key == 'skills':
        return 0.02 + (percent * 0.38)
    elif key == 'education':
        return 0.01 + (percent * 0.24)
    elif key == 'certifications':
        return 0.01 + (percent * 0.19)
    else:
        return DEFAULT_WEIGHTS.get(key, 0.05)


@router.get("/export/candidate_rankings.csv")
def export_job_rankings(
    job_id: str = Query(...),
    work_experience: int = Query(default=50),
    projects: int = Query(default=50),
    skills: int = Query(default=50),
    education: int = Query(default=50),
    certifications: int = Query(default=50)
):
    import io
    import csv
    import re
    
    # Fetch job title
    job_res = supabase.table("jobs").select("title").eq("id", job_id).execute()
    if not job_res.data:
        raise HTTPException(status_code=404, detail="Job not found")
    job_title = cast(dict[str, Any], job_res.data[0]).get("title", "job")
    
    # Fetch resumes
    resumes_res = supabase.table("resumes").select("*, resume_sections(*)").eq("job_id", job_id).execute()
    resumes = cast(list[dict[str, Any]], resumes_res.data or [])
    
    # Map weights
    raw_weights = {
        "work_experience": work_experience,
        "projects": projects,
        "skills": skills,
        "education": education,
        "certifications": certifications,
    }
    
    # Calculate scores and sort
    processed = []
    for r in resumes:
        if r.get("status") != "done":
            processed.append({
                "resume": r,
                "score": -1,
                "status_sort": 1
            })
            continue
            
        sections = cast(list[dict[str, Any]], r.get("resume_sections") or [])
        weighted_sum = 0.0
        weight_total = 0.0
        
        for sec in sections:
            key = sec.get("section_key")
            if isinstance(key, str):
                score = sec.get("score") or 0
                w = get_mapped_weight(key, raw_weights[key]) if key in raw_weights else DEFAULT_WEIGHTS.get(key, 0.05)
                weighted_sum += score * w
                weight_total += w
                
        overall_score = round(weighted_sum / weight_total) if weight_total > 0 else 0
        processed.append({
            "resume": r,
            "score": overall_score,
            "status_sort": 0
        })
        
    # Sort by overall score (highest first), keeping pending at bottom
    processed.sort(key=lambda x: (x["status_sort"], -x["score"]))
    
    output = io.StringIO()
    # Write UTF-8 BOM for Excel compatibility
    output.write('\ufeff')
    
    writer = csv.writer(output)
    
    # Headers
    writer.writerow([
        'Rank', 'Candidate Name', 'Email', 'Overall Match Score (%)', 'Status',
        'Work Experience Score', 'Projects Score', 'Skills Score', 'Education Score',
        'Certifications Score', 'Resume Quality Score', 'Trajectory Score',
        'Impact Quality Score', 'Inferred Intent Score'
    ])
    
    for idx, item in enumerate(processed):
        r = cast(dict[str, Any], item["resume"])
        score = f"{item['score']}%" if item["score"] >= 0 else "Pending"
        app_status = r.get("application_status")
        if app_status == "under_review":
            app_status = "Applied"
            
        sections = cast(list[dict[str, Any]], r.get("resume_sections") or [])
        def get_sec_score(key: str) -> Any:
            sec = next((s for s in sections if s.get("section_key") == key), None)
            return sec.get("score") if sec else "N/A"
            
        writer.writerow([
            idx + 1,
            r.get("candidate_name"),
            r.get("candidate_email"),
            score,
            app_status,
            get_sec_score('work_experience'),
            get_sec_score('projects'),
            get_sec_score('skills'),
            get_sec_score('education'),
            get_sec_score('certifications'),
            get_sec_score('resume_quality'),
            get_sec_score('trajectory'),
            get_sec_score('impact_quality'),
            get_sec_score('inferred_intent')
        ])
        
    # Sanitize title
    safe_title = re.sub(r'[^a-zA-Z0-9\s_-]', '', job_title).strip().replace(' ', '_')
    filename = f"{safe_title}_candidate_rankings.csv"
    
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=\"{filename}\"",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

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