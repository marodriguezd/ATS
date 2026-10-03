import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Resume, JobDescription, Analysis
from app.core.scorer import ATSScorer
from app.core.llm_engine import LLMEngine
from app.core.auto_fixer import ATSAutoFixer
from app.core.exporter import ATSExporter
from app.config import settings

router = APIRouter(prefix="/audit", tags=["Audit"])

class AutoFixRequest(BaseModel):
    resume_id: int
    job_text: Optional[str] = Field(default="", max_length=20000)

class AuditRequest(BaseModel):
    resume_id: int
    job_id: Optional[int] = None
    job_text: Optional[str] = Field(default=None, max_length=20000)

class BulletRewriteRequest(BaseModel):
    bullet: str = Field(min_length=1, max_length=2000)
    role_context: Optional[str] = Field(default="Experiencia laboral", max_length=500)
    target_keywords: Optional[List[str]] = Field(default_factory=list, max_length=20)
    provider: Optional[str] = "gemini"

class SummaryOptimizeRequest(BaseModel):
    current_summary: str = Field(min_length=1, max_length=5000)
    job_text: str = Field(min_length=1, max_length=20000)
    key_skills: Optional[List[str]] = Field(default_factory=list, max_length=30)
    provider: Optional[str] = "gemini"

def _load_parsed(resume) -> dict:
    try:
        return json.loads(resume.parsed_json) if resume.parsed_json else {
            "raw_text": resume.raw_text, "formatting_issues": [], "sections": {}, "contact_info": {}
        }
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Stored parse data is corrupt")

@router.post("/run")
def run_audit(payload: AuditRequest, db: Session = Depends(get_db)):
    resume = db.query(Resume).filter(Resume.id == payload.resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="CV no encontrado")

    job_text = (payload.job_text or "")[:settings.MAX_JOB_TEXT_CHARS]
    job_id = payload.job_id
    if job_id and not job_text:
        job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
        if job:
            job_text = job.raw_text

    resume_parsed = _load_parsed(resume)

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
    try:
        result = await LLMEngine.rewrite_bullet(
            bullet=payload.bullet,
            role_context=payload.role_context,
            target_keywords=payload.target_keywords,
            provider=payload.provider or "gemini",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return result

@router.post("/optimize-summary")
async def optimize_summary(payload: SummaryOptimizeRequest):
    try:
        result = await LLMEngine.generate_tailored_summary(
            current_summary=payload.current_summary,
            job_description=payload.job_text,
            key_skills=payload.key_skills,
            provider=payload.provider or "gemini",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return result

@router.post("/auto-fix")
async def auto_fix_resume(payload: AutoFixRequest, db: Session = Depends(get_db)):
    resume = db.query(Resume).filter(Resume.id == payload.resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="CV no encontrado")

    parsed = _load_parsed(resume)

    # Run auto fixer
    fix_result = await ATSAutoFixer.auto_fix_resume(parsed, (payload.job_text or "")[:settings.MAX_JOB_TEXT_CHARS])
    clean_data = fix_result["ats_clean_data"]
    perfected_score = fix_result["perfected_score"]

    # Export plain text for database storage
    clean_raw_text = ATSExporter.export_text(clean_data)

    # Save as new optimized Resume in DB
    new_resume = Resume(
        title=f"{clean_data['full_name']} (ATS-friendly format)",
        file_type="json",
        raw_text=clean_raw_text,
        parsed_json=json.dumps(clean_data)
    )
    db.add(new_resume)
    db.commit()
    db.refresh(new_resume)

    # Save analysis in DB
    new_analysis = Analysis(
        resume_id=new_resume.id,
        overall_score=perfected_score["overall_score"],
        parseability_score=perfected_score["breakdown"]["parseability"],
        keyword_match_score=perfected_score["breakdown"]["keyword_match"],
        impact_score=perfected_score["breakdown"]["impact"],
        format_score=perfected_score["breakdown"]["format"],
        raw_ats_view=clean_raw_text,
        analysis_details_json=json.dumps(perfected_score)
    )
    db.add(new_analysis)
    db.commit()

    return {
        "original_resume_id": resume.id,
        "new_resume_id": new_resume.id,
        "new_title": new_resume.title,
        "perfected_score": perfected_score,
        "clean_data": clean_data,
        "raw_ats_view": clean_raw_text
    }
