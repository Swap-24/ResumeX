import json
from typing import cast, Any
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

        job = cast(dict[str, Any], response.data[0])
        return {
            "job_description": job.get("description", ""),
            "job_requirements": job.get("requirements", "")
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
            text = response.text
            raw = text.strip() if text else ""

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

            from google.genai.errors import APIError
            import httpx

            is_transient = (
                (isinstance(e, APIError) and e.code in (429, 500, 502, 503, 504)) or
                isinstance(e, (httpx.HTTPError, httpx.RequestError)) or
                any(keyword in error_str for keyword in ["503", "UNAVAILABLE", "429", "RESOURCE_EXHAUSTED", "exhausted", "limit"])
            )

            if is_transient:
                wait_time = 2 ** attempt  # 1s, 2s, 4s
                time.sleep(wait_time)
                continue
            else:
                raise  # non-transient error, fail immediately

    if last_error is not None:
        raise last_error
    raise Exception("Unknown error in _call_gemini")


def run_evaluator(state: ResumeState) -> dict:
    """Agent 1 — scores the concrete, visible parts of the resume."""
    if state.get("error"):
        return {}

    try:
        current_date_str = datetime.now(timezone.utc).strftime("%B %d, %Y")
        prompt = EVALUATOR_PROMPT.format(
            current_date=current_date_str,
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
        current_date_str = datetime.now(timezone.utc).strftime("%B %d, %Y")
        prompt = PROFILER_PROMPT.format(
            current_date=current_date_str,
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
        eval_secs = state.get("evaluator_sections") or []
        prof_secs = state.get("profiler_sections") or []
        combined = list(eval_secs) + list(prof_secs)

        for section in combined:
            section_dict = cast(dict[str, Any], section)
            key = section_dict.get("section_key")
            section_dict["display_order"] = SECTION_ORDER.index(key) if isinstance(key, str) and key in SECTION_ORDER else 99
            # defensively fill any keys Gemini might have dropped
            section_dict.setdefault("positives", [])
            section_dict.setdefault("negatives", [])
            section_dict.setdefault("missing", [])
            section_dict.setdefault("summary", "")

        combined.sort(key=lambda s: cast(dict[str, Any], s).get("display_order", 99))

        return {"scored_sections": combined}

    except Exception as e:
        return {"error": str(e)}


def save_analysis(state: ResumeState) -> dict:
    if state.get("error"):
        supabase.table("resumes").update({
            "status": "failed",
            "overall_summary": f"Pipeline Error: {state.get('error')}"
        }).eq("id", state["resume_id"]).execute()
        return {}

    try:
        sections = state.get("scored_sections") or []
        overall_score = compute_overall_score(sections)

        overall_fit = next((s for s in sections if cast(dict[str, Any], s).get("section_key") == "overall_fit"), None)
        overall_summary = cast(dict[str, Any], overall_fit).get("summary", "") if overall_fit else ""

        section_rows = []
        for section in sections:
            sec_dict = cast(dict[str, Any], section)
            score = sec_dict.get("score")
            score_int = int(score) if score is not None else 0
            section_rows.append({
                "resume_id": state["resume_id"],
                "section_key": sec_dict.get("section_key"),
                "section_label": sec_dict.get("section_label"),
                "score": score_int,
                "label": compute_label(score_int),
                "summary": sec_dict.get("summary"),
                "positives": sec_dict.get("positives"),
                "negatives": sec_dict.get("negatives"),
                "missing": sec_dict.get("missing"),
                "display_order": sec_dict.get("display_order")
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