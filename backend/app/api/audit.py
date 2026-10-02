import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Resume, JobDescription, Analysis
from app.core.scorer import ATSScorer
from app.core.llm_engine import LLMEngine

router = APIRouter(prefix="/audit", tags=["Audit"])

class AuditRequest(BaseModel):
    resume_id: int
    job_id: Optional[int] = None
    job_text: Optional[str] = None

class BulletRewriteRequest(BaseModel):
    bullet: str
    role_context: Optional[str] = "Experiencia laboral"
    target_keywords: Optional[List[str]] = []

class SummaryOptimizeRequest(BaseModel):
    current_summary: str
    job_text: str
    key_skills: Optional[List[str]] = []

@router.post("/run")
def run_audit(payload: AuditRequest, db: Session = Depends(get_db)):
    resume = db.query(Resume).filter(Resume.id == payload.resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="CV no encontrado")

    job_text = payload.job_text or ""
    job_id = payload.job_id
    if job_id and not job_text:
        job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
        if job:
            job_text = job.raw_text

    resume_parsed = json.loads(resume.parsed_json) if resume.parsed_json else {
        "raw_text": resume.raw_text,
        "formatting_issues": [],
        "sections": {},
        "contact_info": {}
    }

    # Run multidimensional scoring
    score_result = ATSScorer.score_all(resume_parsed, job_text)

    # Save analysis in database
    db_analysis = Analysis(
        resume_id=resume.id,
        job_id=job_id,
        overall_score=score_result["overall_score"],
        parseability_score=score_result["breakdown"]["parseability"],
        keyword_match_score=score_result["breakdown"]["keyword_match"],
        impact_score=score_result["breakdown"]["impact"],
        format_score=score_result["breakdown"]["format"],
        raw_ats_view=resume_parsed.get("raw_ats_view", resume.raw_text),
        analysis_details_json=json.dumps(score_result)
    )
    db.add(db_analysis)
    db.commit()
    db.refresh(db_analysis)

    return {
        "analysis_id": db_analysis.id,
        "resume_id": resume.id,
        "job_id": job_id,
        "result": score_result,
        "raw_ats_view": resume_parsed.get("raw_ats_view", resume.raw_text)
    }

@router.post("/rewrite-bullet")
async def rewrite_bullet(payload: BulletRewriteRequest):
    result = await LLMEngine.rewrite_bullet(
        bullet=payload.bullet,
        role_context=payload.role_context,
        target_keywords=payload.target_keywords
    )
    return result

@router.post("/optimize-summary")
async def optimize_summary(payload: SummaryOptimizeRequest):
    result = await LLMEngine.generate_tailored_summary(
        current_summary=payload.current_summary,
        job_description=payload.job_text,
        key_skills=payload.key_skills
    )
    return result
