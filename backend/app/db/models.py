from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.session import Base

def _utcnow():
    return datetime.now(timezone.utc)

class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    file_type = Column(String(50), default="json")  # pdf, docx, json
    raw_text = Column(Text, nullable=False)
    parsed_json = Column(Text, nullable=True) # JSON with structured fields
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    analyses = relationship("Analysis", back_populates="resume", cascade="all, delete-orphan")

class JobDescription(Base):
    __tablename__ = "job_descriptions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    company = Column(String(255), nullable=True)
    raw_text = Column(Text, nullable=False)
    keywords_json = Column(Text, nullable=True) # Extracted keywords
    created_at = Column(DateTime, default=_utcnow)

    analyses = relationship("Analysis", back_populates="job", cascade="all, delete-orphan")

class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=False)
    job_id = Column(Integer, ForeignKey("job_descriptions.id"), nullable=True)

    overall_score = Column(Integer, default=0)
    parseability_score = Column(Integer, default=0)
    keyword_match_score = Column(Integer, default=0)
    impact_score = Column(Integer, default=0)
    format_score = Column(Integer, default=0)

    raw_ats_view = Column(Text, nullable=True)
    analysis_details_json = Column(Text, nullable=True) # detailed breakdowns & suggestions
    created_at = Column(DateTime, default=_utcnow)

    resume = relationship("Resume", back_populates="analyses")
    job = relationship("JobDescription", back_populates="analyses")

class AppSetting(Base):
    __tablename__ = "app_settings"

    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=False)
