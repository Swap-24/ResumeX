from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import jobs, resumes, auth
from contextlib import asynccontextmanager
import asyncio

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Pre-load the sentence-transformers model so the first upload isn't slow."""
    from app.services.embedding_engine import warmup
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, warmup)
    yield
    # (nothing to tear down)

app = FastAPI(
    title="ResumeX",
    description="ResumeX is a web app that allows real-time ranking of resumes using a hybrid semantic + skill-graph scoring engine.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174"
    ],            # restricts origin access to localhost:5173 and 127.0.0.1:5173
    allow_credentials=True,         #allows cookies and auth headers
    allow_methods=["*"],            #allows all HTTP methods
    allow_headers=["*"]             #request headers
)


app.include_router(jobs.router, prefix="/jobs", tags=["Jobs"])          #include jobs router
app.include_router(resumes.router, tags=["Resumes"])  #include resumes router
app.include_router(auth.router, prefix="/auth", tags=["Auth"])           #include auth router


@app.get("/health")
def health():
    return {"status": "ok"}
