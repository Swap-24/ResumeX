import pdfplumber
import re
import io
import unicodedata

def extract_text_from_pdf(file: bytes) -> str:              #text extraction
    text = ""
    with pdfplumber.open(io.BytesIO(file)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text(x_tolerance=2)
            if page_text:
                text += page_text + "\n"
    
    return clean_text(text)

def clean_text(text: str) -> str:
    # Normalize Unicode characters (ligatures, special spaces, accents)
    text = unicodedata.normalize('NFKC', text)
    
    # Replace zero-width spaces and soft hyphens
    text = text.replace('\u200b', '').replace('\xad', '')
    
    # Replace common bullet points and separator symbols with standard ASCII equivalents
    replacements = {
        '•': ' | ',
        '●': ' | ',
        '▪': ' | ',
        '■': ' | ',
        '✦': ' | ',
        '★': ' | ',
        '♦': ' | ',
        '▸': ' | ',
        '◦': ' | ',
        '—': ' - ',
        '–': ' - ',
        '−': ' - ',
    }
    for char, replacement in replacements.items():
        text = text.replace(char, replacement)

    # Replace multiple spaces with a single space       
    text = re.sub(r' {2,}', ' ', text)

    # Replace multiple newlines with a maximum of two newlines
    text = re.sub(r'\n{3,}', '\n\n', text)

    # Strip leading and trailing whitespace from each line
    lines = [line.strip() for line in text.splitlines()]

    # Join the cleaned lines back into a single string and strip leading/trailing whitespace
    text = "\n".join(lines).strip()

    return text
