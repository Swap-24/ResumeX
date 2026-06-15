SCORING_PROMPT = """
You are an expert technical recruiter evaluating a resume against a job description.

JOB TITLE AND DESCRIPTION:
{job_description}

JOB REQUIREMENTS:
{job_requirements}

RESUME:
{resume_text}

Evaluate this resume across exactly these 7 sections:
1. work_experience
2. projects
3. skills
4. education
5. certifications
6. resume_quality
7. overall_fit

Important rules:
- Score every section even if it is absent from the resume
- If the JD does not require work experience (entry level, fresher, internship roles), score work_experience leniently based on any internships, part time work, or volunteer experience
- If the JD explicitly requires experience and none is present, score work_experience low
- Base every observation on actual resume content, do not invent experience
- Be specific in positives and negatives, reference actual content from the resume
- missing should list things expected for this role that are completely absent

Return ONLY a valid JSON array of exactly 7 objects. No markdown, no code fences, no explanation.
Each object must have exactly these keys:
{{
    "section_key": one of the 7 keys above,
    "section_label": human readable name,
    "score": integer 0-100,
    "summary": 2-3 sentence narrative explaining the score,
    "positives": array of specific positive observations,
    "negatives": array of specific gaps or weaknesses,
    "missing": array of things expected for this role that are absent
}}
"""