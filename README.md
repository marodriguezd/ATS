# ATS Resume Suite

A transparent, heuristic **resume and ATS-readability analyzer and optimization tool**. It examines how document structure, extraction order, keyword alignment, evidence quality, and formatting may affect automated screening workflows, and explains every finding with observations and limitations.

Scores are **heuristic audit signals (0–100 per category), not predictions of hiring outcomes**. This project does **not** reproduce any proprietary ATS product (Workday, Taleo, Greenhouse, Lever, iCIMS, SAP SuccessFactors), whose internals are proprietary and vary by employer configuration. It makes no claim of compatibility certification, acceptance probability, or parity with vendor systems.

[![CI](https://github.com/marodriguezd/ATS/actions/workflows/ci.yml/badge.svg)](https://github.com/marodriguezd/ATS/actions/workflows/ci.yml)
[![Demo](https://img.shields.io/badge/Demo-GitHub%20Pages-emerald?style=flat&logo=github)](https://marodriguezd.github.io/ATS/)

Live demo (static standalone app, no backend): https://marodriguezd.github.io/ATS/

## What it does / does not do

Does:

- Extract text from PDF/DOCX/TXT, with layout-risk signals (multi-column reading order, tables, page count).
- Detect standard resume sections (ES/EN, accent-insensitive), keeping `experience` and `projects` strictly disjoint.
- Extract contact details (email/phone/LinkedIn/GitHub) with validation (e.g. years are never mistaken for phone numbers).
- Analyze a job description into REQUIRED / PREFERRED / CONTEXTUAL keyword signals.
- Match keywords through documented lexical alias classes (EXACT / ALIAS / NORMALIZED / RELATED / ABSENT) — lexical matching, not true NLP semantics.
- Score Parseability, Keyword Alignment, Evidence Strength, and Formatting Risk, with per-category explanations and limitations in every response.
- Offer SAFE auto-fix: reordering and normalization only. Missing data stays missing, flagged with explicit warnings; no factual content is ever invented.
- Export canonical ATS-friendly PDF (A4), DOCX, and TXT, covered by export→re-parse invariant tests.
- Optionally assist rewriting via an LLM under strict factuality rules (no invented metrics, employers, or dates), with a deterministic truthful fallback.

Does not:

- Reproduce, simulate, or guarantee the behavior of any vendor ATS.
- Promise compatibility outcomes, certification, or acceptance likelihood.
- Invent employment history, dates, degrees, contact details, or metrics.

## Architecture

- **Backend** (`backend/`): FastAPI + SQLAlchemy/SQLite. Core modules: `ats_parser`, `sections`, `synonyms`, `scorer`, `llm_engine`, `auto_fixer`, `exporter`. The database initializes deterministically via `init_db()` in the app lifespan (no import side effects). The API uses Pydantic schemas, upload validation (extension + magic bytes + size cap), explicit CORS origins (no wildcard-with-credentials), and clear 4xx/5xx errors — a missing resume returns 404 and is never substituted with demo data.
- **Standalone** (`frontend/src/lib/`): the canonical `domain.ts` mirrors backend behavior for offline use on GitHub Pages; `standaloneEngine.ts` runs the same audit/auto-fix pipeline. Synthetic `[DEMO]` fixtures are strictly separated from user data, and the API client records which engine produced each result, failing loudly when a resume is absent.
- **Conformance**: `shared/fixtures/ats_conformance.json` pins section/keyword expectations; backend `pytest` and frontend `vitest` both enforce them, keeping the two engines in semantic parity.

## Scoring methodology

With a job description: keyword 0.40 / evidence 0.25 / parseability 0.20 / format 0.15. Without one: evidence 0.40 / parseability 0.35 / format 0.25 (keyword matching is excluded and scores 0). Penalties are documented in code (e.g. multi-column layout −25 flagged as *risk*, missing email −30). A bare number without an outcome cue does not count as achievement evidence. Every category returns an explanation plus its limitations in the API payload.

## Factuality safeguards

1. Auto-fix and LLM paths never introduce emails, phones, companies, dates, degrees, or metrics absent from the source document.
2. LLM prompts forbid invention; outputs are schema-validated and metric-gated (unsupported metrics are rejected in favor of the truthful fallback).
3. Only implemented providers are advertised (`gemini`, `heuristic`), and `provider` genuinely selects behavior.
4. Covered by `backend/tests/test_factuality.py` (5 invariant tests) that fail loudly on regression.

## Security model

- **Server mode**: prefer `GEMINI_API_KEY` via environment/secret management (see `backend/.env.example`). `GET /api/settings/` returns configured-flags only, never key material. A provider allow-list is enforced.
- **Browser-only mode**: any key is stored in `localStorage`, which is XSS-readable by design; the UI states this explicitly. No secrets are logged (the Gemini key travels via header, never URL).
- CORS uses explicit origins from the environment with methods limited to GET/POST; uploads are capped (`MAX_UPLOAD_BYTES`, default 10 MB) with magic-byte checks.

## Local development

Prerequisites: Python 3.12, Node 20+, pnpm.

```bash
./start.sh                 # venv + deps + backend :8000 + frontend :3000
./start.sh --backend-only
./start.sh --frontend-only
```

Manual setup:

```bash
python3 -m venv backend/venv
./backend/venv/bin/pip install -r backend/requirements.txt
./backend/venv/bin/uvicorn app.main:app --app-dir ./backend --host 127.0.0.1 --port 8000
pnpm --prefix frontend install
pnpm --prefix frontend dev
```

## Testing

```bash
PYTHONPATH=./backend ./backend/venv/bin/python -m pytest backend/tests -q
pnpm --prefix frontend exec vitest run
pnpm --prefix frontend exec tsc --noEmit
pnpm --prefix frontend exec eslint src/lib/
GITHUB_PAGES=true pnpm --prefix frontend build
```

## GitHub Pages deployment

Pages hosts only the static standalone app (`frontend/out`); it does not host the FastAPI backend. `deploy-pages.yml` runs lint, typecheck, and tests before building; `ci.yml` additionally runs the backend suite on every push and pull request.

## Limitations

- Lexical alias matching, not semantic understanding; RELATED matches are down-weighted accordingly.
- Layout analysis is heuristic (coordinate grouping); complex designs may still parse poorly.
- SQLite is single-file local persistence with no migration framework (deterministic `create_all` via `init_db()`; adopt Alembic if the schema grows).
- LLM-assisted quality depends on provider availability; the offline fallback only rewords, never invents.

## License

MIT — see [LICENSE](LICENSE).
