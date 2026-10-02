import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import JobDescription
from app.core.scorer import ATSScorer

router = APIRouter(prefix="/jobs", tags=["Jobs"])

class JobCreate(BaseModel):
    title: str
    company: Optional[str] = None
    raw_text: str

@router.post("/")
def create_job(payload: JobCreate, db: Session = Depends(get_db)):
    # Extract keywords
    _, kw_details = ATSScorer._calculate_keywords("", payload.raw_text)
    keywords = kw_details.get("total_extracted_keywords", 0)

    db_job = JobDescription(
        title=payload.title,
        company=payload.company,
        raw_text=payload.raw_text,
        keywords_json=json.dumps(kw_details)
    )
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return {
        "id": db_job.id,
        "title": db_job.title,
        "company": db_job.company,
        "keywords": kw_details
    }

@router.get("/")
def list_jobs(db: Session = Depends(get_db)):
    jobs = db.query(JobDescription).order_by(JobDescription.created_at.desc()).all()
    return [{
        "id": j.id,
        "title": j.title,
        "company": j.company,
        "created_at": j.created_at.isoformat()
    } for j in jobs]

@router.get("/{job_id}")
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Oferta no encontrada")
    return {
        "id": job.id,
        "title": job.title,
        "company": job.company,
        "raw_text": job.raw_text,
        "keywords": json.loads(job.keywords_json) if job.keywords_json else None
    }
