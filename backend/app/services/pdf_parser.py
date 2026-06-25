import pdfplumber
import re
import io

def extract_text_from_pdf(file: bytes) -> str:              #text extraction
    text = ""
    with pdfplumber.open(io.BytesIO(file)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text(layout=True)
            if page_text:
                text += page_text + "\n"
    
    return clean_text(text)

def clean_text(text: str) -> str:

    text = text.encode("ascii", "ignore").decode()            #cleaning text

    text = re.sub(r' {2,}', ' ', text)                        # Replace multiple spaces with a single space       

    text = re.sub(r'\n{3,}', '\n\n', text)                    # Replace multiple newlines with a maximum of two newlines

    lines = [line.strip() for line in text.splitlines()]      # Strip leading and trailing whitespace from each line

    text = "\n".join(lines).strip()                           # Join the cleaned lines back into a single string and strip leading/trailing whitespace

    return text
