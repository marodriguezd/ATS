import json
import re
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Response
from pydantic import BaseModel, Field
from typing import List, Optional
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Resume
from app.core.ats_parser import ATSParser
from app.core.exporter import ATSExporter
from app.config import settings

router = APIRouter(prefix="/resumes", tags=["Resumes"])

ALLOWED_EXT = {"pdf", "docx", "doc", "txt", "md"}
PDF_MAGIC = b"%PDF"
DOCX_MAGIC = b"PK\x03\x04"

MAX_UPLOAD_BYTES = settings.MAX_UPLOAD_BYTES


class CustomResumeCreate(BaseModel):
    title: str = Field(default="Mi CV", max_length=200)
    full_name: Optional[str] = Field(default=None, max_length=200)
    email: Optional[str] = Field(default=None, max_length=320)
    phone: Optional[str] = Field(default=None, max_length=60)
    location: Optional[str] = Field(default=None, max_length=200)
    linkedin: Optional[str] = Field(default=None, max_length=300)
    github: Optional[str] = Field(default=None, max_length=300)
    summary: Optional[str] = Field(default="", max_length=5000)
    skills: List[str] = Field(default_factory=list, max_length=100)
    experience: List[dict] = Field(default_factory=list)
    education: List[dict] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list, max_length=50)


def _safe_filename(title: str, ext: str) -> str:
    base = re.sub(r"[^A-Za-z0-9._-]+", "_", (title or "resume"))[:80] or "resume"
    return f"{base}_ATS.{ext}"


def _check_magic(ext: str, content: bytes) -> None:
    if ext == "pdf" and not content.startswith(PDF_MAGIC):
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid PDF (magic bytes mismatch).")
    if ext in ("docx", "doc") and not content.startswith(DOCX_MAGIC):
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid DOCX (magic bytes mismatch).")


@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    title: str = Form(None),
    db: Session = Depends(get_db),
):
    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail=f"File too large (limit {MAX_UPLOAD_BYTES} bytes).")
    if not content:
        raise HTTPException(status_code=400, detail="Empty file.")
    filename = file.filename or "resume"
    ext = filename.split(".")[-1].lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail="Unsupported format. Upload PDF, DOCX or TXT.")

    try:
        if ext == "pdf":
            _check_magic(ext, content)
            parsed = ATSParser.parse_pdf(content)
            file_type = "pdf"
        elif ext in ["docx", "doc"]:
            _check_magic(ext, content)
            parsed = ATSParser.parse_docx(content)
            file_type = "docx"
        else:
            try:
                text_str = content.decode("utf-8")
            except UnicodeDecodeError:
                raise HTTPException(status_code=400, detail="Text file is not valid UTF-8.")
            parsed = ATSParser.parse_plain_text(text_str)
            file_type = "txt"
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not parse document: {type(e).__name__}")

    resume_title = (title or filename)[:200]
    db_resume = Resume(
        title=resume_title,
        file_type=file_type,
        raw_text=parsed["raw_text"][:200000],
        parsed_json=json.dumps(parsed),
    )
    db.add(db_resume)
    db.commit()
    db.refresh(db_resume)

    return {
        "id": db_resume.id,
        "title": db_resume.title,
        "file_type": db_resume.file_type,
        "parsed": parsed,
    }


@router.post("/create")
def create_custom_resume(data: CustomResumeCreate, db: Session = Depends(get_db)):
    """Create a structured resume from the visual builder (validated schema)."""
    payload = data.model_dump()
    raw_text = ATSExporter.export_text(payload)
    db_resume = Resume(
        title=payload["title"],
        file_type="json",
        raw_text=raw_text,
        parsed_json=json.dumps(payload),
    )
    db.add(db_resume)
    db.commit()
    db.refresh(db_resume)
    return {"id": db_resume.id, "title": db_resume.title}


@router.get("/")
def list_resumes(db: Session = Depends(get_db)):
    resumes = db.query(Resume).order_by(Resume.created_at.desc()).all()
    return [{
        "id": r.id,
        "title": r.title,
        "file_type": r.file_type,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    } for r in resumes]


@router.get("/{resume_id}")
def get_resume(resume_id: int, db: Session = Depends(get_db)):
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="CV no encontrado")
    try:
        parsed = json.loads(resume.parsed_json) if resume.parsed_json else None
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Stored parse data is corrupt")
    return {
        "id": resume.id,
        "title": resume.title,
        "file_type": resume.file_type,
        "raw_text": resume.raw_text,
        "parsed": parsed,
        "created_at": resume.created_at.isoformat() if resume.created_at else None,
    }


@router.get("/{resume_id}/export/{format_type}")
def export_resume(resume_id: int, format_type: str, db: Session = Depends(get_db)):
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="CV no encontrado")
    try:
        parsed = json.loads(resume.parsed_json) if resume.parsed_json else {}
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Stored parse data is corrupt")

    sections = parsed.get("sections", {}) or {}
    contact = parsed.get("contact_info", {}) or {}
    export_data = {
        "full_name": parsed.get("full_name") or re.sub(r"\.(pdf|docx)$", "", resume.title)[:200],
        "email": parsed.get("email") or contact.get("email"),
        "phone": parsed.get("phone") or contact.get("phone"),
        "linkedin": parsed.get("linkedin") or contact.get("linkedin"),
        "github": parsed.get("github") or contact.get("github"),
        "location": parsed.get("location") or contact.get("location"),
        "summary": parsed.get("summary") or sections.get("summary", ""),
        "experience": parsed.get("experience", []),
        "education": parsed.get("education", []),
        "skills": parsed.get("skills") or [s.strip() for s in sections.get("skills", "").split(",") if s.strip()],
        "certifications": parsed.get("certifications", []),
    }
    if not export_data["experience"] and sections.get("experience"):
        exp_lines = [ln.strip() for ln in sections["experience"].split("\n") if ln.strip()]
        export_data["experience"] = [{
            "role": "Experience (from source)", "company": "", "dates": "", "bullets": exp_lines[:8],
        }]

    fmt = format_type.lower()
    if fmt == "pdf":
        pdf_bytes = ATSExporter.export_pdf(export_data)
        return Response(content=pdf_bytes, media_type="application/pdf",
                        headers={"Content-Disposition": f'attachment; filename="{_safe_filename(resume.title, "pdf")}"'})
    elif fmt == "docx":
        docx_bytes = ATSExporter.export_docx(export_data)
        return Response(content=docx_bytes,
                        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                        headers={"Content-Disposition": f'attachment; filename="{_safe_filename(resume.title, "docx")}"'})
    elif fmt in ["txt", "text"]:
        text_content = ATSExporter.export_text(export_data)
        return Response(content=text_content, media_type="text/plain; charset=utf-8",
                        headers={"Content-Disposition": f'attachment; filename="{_safe_filename(resume.title, "txt")}"'})
    else:
        raise HTTPException(status_code=400, detail="Formato no soportado (pdf, docx, txt)")
