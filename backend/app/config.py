from typing import Optional
import os


def _csv_env(name: str, default: str) -> list[str]:
    raw = os.getenv(name, default)
    return [o.strip() for o in raw.split(",") if o.strip()]


class Settings:
    PROJECT_NAME: str = "ATS Resume Suite"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./ats_suite.db")
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", None)
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY", None)
    DEFAULT_LLM_PROVIDER: str = os.getenv("DEFAULT_LLM_PROVIDER", "gemini")
    DEFAULT_MODEL: str = os.getenv("DEFAULT_MODEL", "gemini-2.5-flash")
    # Explicit CORS configuration (no wildcard + credentials combo).
    CORS_ORIGINS: list[str] = _csv_env(
        "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    )
    CORS_ORIGINS_PROD: list[str] = _csv_env("CORS_ORIGINS_PROD", "")
    MAX_UPLOAD_BYTES: int = int(os.getenv("MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))
    MAX_JOB_TEXT_CHARS: int = int(os.getenv("MAX_JOB_TEXT_CHARS", "20000"))


settings = Settings()
