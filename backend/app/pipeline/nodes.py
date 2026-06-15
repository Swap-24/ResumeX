import json
from google import genai
from google.genai import types
from app.config import GEMINI_API_KEY
from app.database import supabase
from app.pipeline.state import ResumeState
from app.pipeline.prompts import SCORING_PROMPT
from app.services.scorer import compute_overall_score, compute_label
from datetime import datetime, timezone

client = genai.Client(api_key=GEMINI_API_KEY)

SECTION_ORDER = [
    "work_experience",
    "projects",
    "skills",
    "education",
    "certifications",
    "resume_quality",
    "overall_fit"
]

def fetch_job(state: ResumeState) -> dict:              #fetch job from suoabase using job_id
    try:
        response = (supabase
                    .table("jobs")
                    .select("*")
                    .eq("id", state["job_id"])
                    .execute())
        if not response.data:
            return {"error": "The job you're looking for does not exist or cannot be found"}
        job = response.data[0]
        return{
            "job_description": job["description"],
            "job_requirements": job["requirements"]
        }
    except Exception as e:
        return {"error": f"Error fetching job from database: {str(e)}"}
    
    
def score_sections(state: ResumeState) -> list[dict]:
    if state.get("error"):
        return {}
    prompt = SCORING_PROMPT.format(
        job_description=state["job_description"],
        job_requirements=state["job_requirements"],
        resume_text=state["raw_text"]
    )

    response = client.models.generate_content(
    model="gemini-2.5-flash-lite",
    contents=prompt,
    config=types.GenerateContentConfig(
        response_mime_type="application/json"
    )
)
    raw = response.text.strip()
    print("RAW MODEL RESPONSE:", raw)         #debugging log to see raw response from model

    try:
        sections = json.loads(raw)          #parse json
    except json.JSONDecodeError:
        return {"error": "Error parsing model response as JSON"}
    except Exception as e:
        return {"error": f"weird error during parsing: {str(e)}"}
    
    for section in sections:                #maintain order of sections
        key = section["section_key"]
        section["display_order"] = SECTION_ORDER.index(key) if key in SECTION_ORDER else 99
    
    return {"scored_sections": sections}

def save_analysis(state: ResumeState) -> dict:
    if state.get("error"):
        supabase.table("resumes").update({
            "status": "failed"
        }).eq("id", state["resume_id"]).execute()
        return {}
    try:
        sections = state["scored_sections"]
        overall_score = compute_overall_score(sections)

        overall_fit = next(
            (section for section in sections if section["section_key"] == "overall_fit"),
            None
        )
        overall_summary = overall_fit["summary"] if overall_fit else ""

        section_rows = []
        for section in sections:
            section_rows.append({
                "resume_id": state["resume_id"],
                "section_key": section["section_key"],
                "section_label": section["section_label"],
                "score": section["score"],
                "label": compute_label(section["score"]),
                "summary": section["summary"],
                "positives": section["positives"],
                "negatives": section["negatives"],
                "missing": section["missing"],
                "display_order": section["display_order"]
            })

        supabase.table("resume_sections").insert(section_rows).execute()

        supabase.table("resumes").update({
            "overall_score": overall_score,
            "overall_summary": overall_summary,
            "status": "done",
            "analyzed_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", state["resume_id"]).execute()

        return {
            "overall_score": overall_score,
            "overall_summary": overall_summary
        }
    
    except Exception as e:

        supabase.table("resumes").update({
            "status": "failed"
        }).eq("id", state["resume_id"]).execute()
        return {"error": str(e)}
    
