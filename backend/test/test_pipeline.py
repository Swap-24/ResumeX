import sys
sys.path.append(".")

from app.pipeline.graph import pipeline
from app.services.pdf_parser import extract_text_from_pdf

JOB_ID = "886f6f9d-3bf0-42fc-af83-508e03c2522b"

with open("test/test_resume.pdf", "rb") as f:
    file_bytes = f.read()

from app.services.pdf_parser import extract_text_from_pdf
raw_text = extract_text_from_pdf(file_bytes)

RESUME_ID = "edb738f4-d6eb-49bc-b271-9da5fe0c03fb"

result = pipeline.invoke({
    "resume_id": RESUME_ID,
    "job_id": JOB_ID,
    "raw_text": raw_text,
    "job_description": "",
    "job_requirements": "",
    "scored_sections": None,
    "overall_score": None,
    "overall_summary": None,
    "error": None
})

print("STATUS:", result.get("error") or "success")
print("OVERALL SCORE:", result.get("overall_score"))
print("SECTIONS:")
for s in result.get("scored_sections") or []:
    print(f"  {s['section_key']}: {s['score']}")