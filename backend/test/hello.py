import sys
from google import genai

sys.path.append(".")
from app.config import GEMINI_API_KEY


client = genai.Client(api_key=GEMINI_API_KEY)

response = client.models.generate_content(
    model="gemini-2.0-flash",
    contents="Say hello in one word"
)

print(response.text)