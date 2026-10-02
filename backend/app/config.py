from typing import Optional
import os

class Settings:
    PROJECT_NAME: str = "ATS Resume Suite"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./ats_suite.db")
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", None)
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY", None)
    DEFAULT_LLM_PROVIDER: str = os.getenv("DEFAULT_LLM_PROVIDER", "gemini")
    DEFAULT_MODEL: str = os.getenv("DEFAULT_MODEL", "gemini-2.5-flash")

settings = Settings()
