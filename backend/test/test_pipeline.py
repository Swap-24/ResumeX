import sys
sys.path.append(".")

from app.services.pdf_parser import extract_text_from_pdf

with open("test/test_resume.pdf", "rb") as f:
    file_bytes = f.read()

text = extract_text_from_pdf(file_bytes)
print(text)