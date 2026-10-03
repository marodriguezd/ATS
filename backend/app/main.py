from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.session import Base, engine, init_db
from app.db import models  # noqa: F401  (register tables)
from app.api import resumes, jobs, audit, settings as settings_api


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


def _allowed_origins() -> list[str]:
    origins = list(settings.CORS_ORIGINS)
    if settings.CORS_ORIGINS_PROD:
        origins += settings.CORS_ORIGINS_PROD
    # Deduplicate, never allow "*" together with credentials.
    return [o for o in dict.fromkeys(origins) if o != "*"]


app = FastAPI(
    title="ATS Resume Suite API",
    description="Heuristic ATS-readability analysis, optimization and export of CVs",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(resumes.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(audit.router, prefix="/api")
app.include_router(settings_api.router, prefix="/api")


@app.get("/")
def health_check():
    return {
        "status": "online",
        "service": "ATS Resume Suite API",
        "version": "1.0.0",
    }
