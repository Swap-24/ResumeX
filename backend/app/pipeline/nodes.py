import json
from google import genai
from app.config import GEMINI_API_KEY
from app.database import supabase
from app.pipeline.state import ResumeState
from app.pipeline.prompts import EVALUATOR_PROMPT, PROFILER_PROMPT
from app.services.scorer import compute_overall_score, compute_label
from datetime import datetime, timezone
import time

client = genai.Client(api_key=GEMINI_API_KEY)

SECTION_ORDER = [
    "work_experience",
    "projects",
    "skills",
    "education",
    "certifications",
    "resume_quality",
    "trajectory",
    "impact_quality",
    "inferred_intent",
    "overall_fit"
]


def fetch_job(state: ResumeState) -> dict:
    try:
        response = supabase.table("jobs").select("*").eq("id", state["job_id"]).execute()

        if not response.data:
            return {"error": "Job not found"}

        job = response.data[0]
        return {
            "job_description": job["description"],
            "job_requirements": job["requirements"]
        }
    except Exception as e:
        return {"error": str(e)}


def _call_gemini(prompt: str, max_retries: int = 3) -> list[dict]:
    last_error = None

    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            raw = response.text.strip()

            if raw.startswith("```"):
                raw = raw.strip("`")
                if raw.startswith("json"):
                    raw = raw[4:]
                raw = raw.strip()
            
            print(raw)

            return json.loads(raw)

        except Exception as e:
            last_error = e
            error_str = str(e)

            # only retry on transient errors, not on bad JSON or bad input
            if "503" in error_str or "UNAVAILABLE" in error_str or "429" in error_str:
                wait_time = 2 ** attempt  # 1s, 2s, 4s
                time.sleep(wait_time)
                continue
            else:
                raise  # non-transient error, fail immediately

    raise last_error


def run_evaluator(state: ResumeState) -> dict:
    """Agent 1 — scores the concrete, visible parts of the resume."""
    if state.get("error"):
        return {}

    try:
        prompt = EVALUATOR_PROMPT.format(
            job_description=state["job_description"],
            job_requirements=state["job_requirements"],
            resume_text=state["raw_text"]
        )

        sections = _call_gemini(prompt)
        return {"evaluator_sections": sections}

    except json.JSONDecodeError as e:
        return {"error": f"Evaluator returned invalid JSON: {str(e)}"}
    except Exception as e:
        return {"error": str(e)}


def run_profiler(state: ResumeState) -> dict:
    """Agent 2 — reads hidden signals: trajectory, impact, intent, overall fit."""
    if state.get("error"):
        return {}

    try:
        prompt = PROFILER_PROMPT.format(
            job_description=state["job_description"],
            job_requirements=state["job_requirements"],
            resume_text=state["raw_text"]
        )

        sections = _call_gemini(prompt)
        return {"profiler_sections": sections}

    except json.JSONDecodeError as e:
        return {"error": f"Profiler returned invalid JSON: {str(e)}"}
    except Exception as e:
        return {"error": str(e)}


def combine_sections(state: ResumeState) -> dict:
    if state.get("error"):
        return {}

    try:
        combined = list(state["evaluator_sections"]) + list(state["profiler_sections"])

        for section in combined:
            key = section["section_key"]
            section["display_order"] = SECTION_ORDER.index(key) if key in SECTION_ORDER else 99
            # defensively fill any keys Gemini might have dropped
            section.setdefault("positives", [])
            section.setdefault("negatives", [])
            section.setdefault("missing", [])
            section.setdefault("summary", "")

        combined.sort(key=lambda s: s["display_order"])

        return {"scored_sections": combined}

    except Exception as e:
        return {"error": str(e)}


def save_analysis(state: ResumeState) -> dict:
    if state.get("error"):
        supabase.table("resumes").update({
            "status": "failed"
        }).eq("id", state["resume_id"]).execute()
        return {}

    try:
        sections = state["scored_sections"]
        overall_score = compute_overall_score(sections)

        overall_fit = next((s for s in sections if s["section_key"] == "overall_fit"), None)
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