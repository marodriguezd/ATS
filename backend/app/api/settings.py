import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from typing import Optional
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import AppSetting
from app.config import settings

router = APIRouter(prefix="/settings", tags=["Settings"])

ALLOWED_PROVIDERS = ("gemini", "heuristic")


class SettingsUpdate(BaseModel):
    gemini_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    default_provider: Optional[str] = "gemini"

    @field_validator("default_provider")
    @classmethod
    def check_provider(cls, v):
        if v is not None and v not in ALLOWED_PROVIDERS:
            raise ValueError(f"Unsupported provider. Allowed: {ALLOWED_PROVIDERS}")
        return v


@router.get("/")
def get_settings(db: Session = Depends(get_db)):
    gemini_key_db = db.query(AppSetting).filter(AppSetting.key == "gemini_api_key").first()
    provider_db = db.query(AppSetting).filter(AppSetting.key == "default_provider").first()

    gemini_key = gemini_key_db.value if gemini_key_db else (os.getenv("GEMINI_API_KEY") or "")
    provider = provider_db.value if provider_db else settings.DEFAULT_LLM_PROVIDER

    # Never return full or partial secrets: only configured flags.
    return {
        "gemini_api_key_configured": bool(gemini_key),
        "openai_api_key_configured": False,
        "default_provider": provider,
        "security_note": (
            "Server mode: keys are read from environment variables when available. "
            "Keys sent here are stored server-side; prefer environment/secret management."
        ),
    }


@router.post("/")
def update_settings(payload: SettingsUpdate, db: Session = Depends(get_db)):
    if payload.gemini_api_key is not None:
        if payload.gemini_api_key and len(payload.gemini_api_key) < 8:
            raise HTTPException(status_code=400, detail="API key looks too short.")
        rec = db.query(AppSetting).filter(AppSetting.key == "gemini_api_key").first()
        if not rec:
            rec = AppSetting(key="gemini_api_key", value=payload.gemini_api_key)
            db.add(rec)
        else:
            rec.value = payload.gemini_api_key

    # OpenAI provider is not implemented: reject to avoid false advertising.
    if payload.openai_api_key is not None:
        raise HTTPException(status_code=400, detail="OpenAI provider is not supported by this build.")

    if payload.default_provider is not None:
        rec = db.query(AppSetting).filter(AppSetting.key == "default_provider").first()
        if not rec:
            rec = AppSetting(key="default_provider", value=payload.default_provider)
            db.add(rec)
        else:
            rec.value = payload.default_provider

    db.commit()
    return {"status": "success"}
