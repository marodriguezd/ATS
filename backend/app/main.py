from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.session import engine, Base
from app.db import models
from app.api import resumes, jobs, audit, settings as settings_api

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ATS Resume Suite API",
    description="Motor híbrido de auditoría, optimización y exportación de CVs para filtros ATS",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resumes.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(audit.router, prefix="/api")
app.include_router(settings_api.router, prefix="/api")

@app.get("/")
def health_check():
    return {
        "status": "online",
        "service": "ATS Resume Suite API",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
