from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import jobs, resumes

app = FastAPI(title = "ResumeX", description = "ResumeX is a web app that allows real time ranking of resumes based on job descriptions using AI")  #initialize app

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],            #allows frontend to access backend ez no CORS issues
    allow_credentials=True,         #allows cookies and auth headers
    allow_methods=["*"],            #allows all HTTP methods
    allow_headers=["*"]             #request headers
)


app.include_router(jobs.router, prefix="/jobs", tags=["Jobs"])          #include jobs router
app.include_router(resumes.router, prefix="/resumes", tags=["Resumes"])  #include resumes router


@app.get("/health")
def health():
    return {"status": "ok"}
