from dotenv import load_dotenv
import os

load_dotenv() #importing env vars

SUPABASE_URL = os.getenv("SUPABASE_URL")        #db url
SUPABASE_KEY = os.getenv("SUPABASE_KEY")        #db key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")    #gemini api key