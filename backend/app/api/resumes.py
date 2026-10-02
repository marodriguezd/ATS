import json
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Response
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Resume
from app.core.ats_parser import ATSParser
from app.core.exporter import ATSExporter

router = APIRouter(prefix="/resumes", tags=["Resumes"])

@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    title: str = Form(None),
    db: Session = Depends(get_db)
):
    content = await file.read()
    filename = file.filename or "resume"
    ext = filename.split(".")[-1].lower()

    if ext == "pdf":
        parsed = ATSParser.parse_pdf(content)
        file_type = "pdf"
    elif ext in ["docx", "doc"]:
        parsed = ATSParser.parse_docx(content)
        file_type = "docx"
    elif ext in ["txt", "md"]:
        text_str = content.decode("utf-8", errors="ignore")
        parsed = ATSParser.parse_plain_text(text_str)
        file_type = "txt"
    else:
        raise HTTPException(status_code=400, detail="Formato no soportado. Sube un PDF, DOCX o TXT.")

    resume_title = title or filename
    db_resume = Resume(
        title=resume_title,
        file_type=file_type,
        raw_text=parsed["raw_text"],
        parsed_json=json.dumps(parsed)
    )
    db.add(db_resume)
    db.commit()
    db.refresh(db_resume)

    return {
        "id": db_resume.id,
        "title": db_resume.title,
        "file_type": db_resume.file_type,
        "parsed": parsed
    }

@router.post("/create")
def create_custom_resume(data: dict, db: Session = Depends(get_db)):
    """Create a structured resume from the visual builder"""
    title = data.get("title", "Mi CV Optimizado")
    parsed_json = json.dumps(data)
    # Generate plain text representation
    raw_text = ATSExporter.export_text(data)

    db_resume = Resume(
        title=title,
        file_type="json",
        raw_text=raw_text,
        parsed_json=parsed_json
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
        "created_at": r.created_at.isoformat()
    } for r in resumes]

@router.get("/{resume_id}")
def get_resume(resume_id: int, db: Session = Depends(get_db)):
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="CV no encontrado")
    return {
        "id": resume.id,
        "title": resume.title,
        "file_type": resume.file_type,
        "raw_text": resume.raw_text,
        "parsed": json.loads(resume.parsed_json) if resume.parsed_json else None,
        "created_at": resume.created_at.isoformat()
    }

@router.get("/{resume_id}/export/{format_type}")
def export_resume(resume_id: int, format_type: str, db: Session = Depends(get_db)):
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="CV no encontrado")

    parsed = json.loads(resume.parsed_json) if resume.parsed_json else {}

    # Standardize data structure for export
    sections = parsed.get("sections", {})
    contact = parsed.get("contact_info", {})

    export_data = {
        "full_name": parsed.get("full_name") or resume.title.replace(".pdf", "").replace(".docx", ""),
        "email": parsed.get("email") or contact.get("email"),
        "phone": parsed.get("phone") or contact.get("phone"),
        "linkedin": parsed.get("linkedin") or contact.get("linkedin"),
        "github": parsed.get("github") or contact.get("github"),
        "location": parsed.get("location") or contact.get("location"),
        "summary": parsed.get("summary") or sections.get("summary", ""),
        "experience": parsed.get("experience", []),
        "education": parsed.get("education", []),
        "skills": parsed.get("skills") or [s.strip() for s in sections.get("skills", "").split(",") if s.strip()],
        "certifications": parsed.get("certifications", [])
    }

    # If experience list is empty but text section exists
    if not export_data["experience"] and sections.get("experience"):
        exp_lines = [l.strip() for l in sections["experience"].split("\n") if l.strip()]
        export_data["experience"] = [{
            "role": "Experiencia Laboral",
            "company": "",
            "dates": "",
            "bullets": exp_lines[:8]
        }]

    if format_type.lower() == "pdf":
        pdf_bytes = ATSExporter.export_pdf(export_data)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{resume.title}_ATS.pdf"'}
        )
    elif format_type.lower() == "docx":
        docx_bytes = ATSExporter.export_docx(export_data)
        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{resume.title}_ATS.docx"'}
        )
    elif format_type.lower() in ["txt", "text"]:
        text_content = ATSExporter.export_text(export_data)
        return Response(
            content=text_content,
            media_type="text/plain; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{resume.title}_ATS.txt"'}
        )
    else:
        raise HTTPException(status_code=400, detail="Formato no soportado (pdf, docx, txt)")
