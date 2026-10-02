import os
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import AppSetting
from app.config import settings

router = APIRouter(prefix="/settings", tags=["Settings"])

class SettingsUpdate(BaseModel):
    gemini_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    default_provider: Optional[str] = "gemini"

@router.get("/")
def get_settings(db: Session = Depends(get_db)):
    gemini_key_db = db.query(AppSetting).filter(AppSetting.key == "gemini_api_key").first()
    openai_key_db = db.query(AppSetting).filter(AppSetting.key == "openai_api_key").first()
    provider_db = db.query(AppSetting).filter(AppSetting.key == "default_provider").first()

    gemini_key = gemini_key_db.value if gemini_key_db else (os.getenv("GEMINI_API_KEY") or "")
    openai_key = openai_key_db.value if openai_key_db else (os.getenv("OPENAI_API_KEY") or "")
    provider = provider_db.value if provider_db else settings.DEFAULT_LLM_PROVIDER

    # Mask keys for security
    def mask(k):
        if not k:
            return ""
        return k[:4] + "..." + k[-4:] if len(k) > 8 else "configured"

    return {
        "gemini_api_key_configured": bool(gemini_key),
        "gemini_api_key_masked": mask(gemini_key),
        "openai_api_key_configured": bool(openai_key),
        "openai_api_key_masked": mask(openai_key),
        "default_provider": provider
    }

@router.post("/")
def update_settings(payload: SettingsUpdate, db: Session = Depends(get_db)):
    if payload.gemini_api_key is not None:
        rec = db.query(AppSetting).filter(AppSetting.key == "gemini_api_key").first()
        if not rec:
            rec = AppSetting(key="gemini_api_key", value=payload.gemini_api_key)
            db.add(rec)
        else:
            rec.value = payload.gemini_api_key
        os.environ["GEMINI_API_KEY"] = payload.gemini_api_key

    if payload.openai_api_key is not None:
        rec = db.query(AppSetting).filter(AppSetting.key == "openai_api_key").first()
        if not rec:
            rec = AppSetting(key="openai_api_key", value=payload.openai_api_key)
            db.add(rec)
        else:
            rec.value = payload.openai_api_key
        os.environ["OPENAI_API_KEY"] = payload.openai_api_key

    if payload.default_provider is not None:
        rec = db.query(AppSetting).filter(AppSetting.key == "default_provider").first()
        if not rec:
            rec = AppSetting(key="default_provider", value=payload.default_provider)
            db.add(rec)
        else:
            rec.value = payload.default_provider

    db.commit()
    return {"status": "success"}
