# ATS Resume Suite

Transparent, heuristic **ATS-readability and resume optimization suite**: analyzes how document structure, extraction order, keyword alignment, evidence quality, and formatting may affect automated screening workflows. It is **not** a reproduction of any proprietary ATS product (Workday, Taleo, Greenhouse, Lever, iCIMS, SAP SuccessFactors), and scores are **heuristic audit signals (0–100)**, not probabilities of acceptance.

[![CI](https://github.com/marodriguezd/ATS/actions/workflows/ci.yml/badge.svg)](https://github.com/marodriguezd/ATS/actions/workflows/ci.yml)
[![Demo](https://img.shields.io/badge/Demo-GitHub%20Pages-emerald?style=flat&logo=github)](https://marodriguezd.github.io/ATS/)

Live demo (static standalone app, no backend): https://marodriguezd.github.io/ATS/

## What it does / does not do

Does:
- Extract text from PDF/DOCX/TXT with layout-risk signals (multi-column, tables, reading order).
- Detect standard sections (ES/EN, accent-insensitive) with disjoint `experience` vs `projects` handling.
- Extract contact info (email/phone/LinkedIn/GitHub) with validation (years are not phones).
- Analyze a job description into REQUIRED / PREFERRED / CONTEXTUAL keyword signals.
- Match keywords via documented lexical alias classes (EXACT / ALIAS / NORMALIZED / RELATED / ABSENT) — not true NLP semantics.
- Score Parseability, Keyword Alignment, Evidence Strength, Formatting Risk with per-category explanations and limitations.
- Offer SAFE auto-fix: reorder/normalize only. Missing data stays missing with explicit warnings; nothing factual is invented.
- Export canonical ATS-friendly PDF (A4), DOCX, TXT with export→re-parse invariant tests.
- Optional LLM-assisted rewriting under strict factuality rules (no invented metrics/employers/dates) with deterministic truthful fallback.

Does not:
- Reproduce or guarantee behavior of any vendor ATS.
- Promise rejection statistics or "100% compatible" outcomes.
- Invent employment history, dates, degrees, contact details, or metrics.

## Architecture

- **Backend** (`backend/`): FastAPI + SQLAlchemy/SQLite. Modules: `ats_parser`, `sections`, `synonyms`, `scorer`, `llm_engine`, `auto_fixer`, `exporter`. DB initializes deterministically via `init_db()` in app lifespan (no import side effects). API uses Pydantic schemas, upload validation (extension + magic bytes + size cap), explicit CORS origins (no `*` + credentials), and clear 4xx/5xx errors (missing resumes are 404, never substituted with demo data).
- **Standalone** (`frontend/src/lib/`): canonical `domain.ts` mirrors backend behavior for GitHub Pages offline use; `standaloneEngine.ts` runs the same audit/autofix; `demoData` (synthetic `[DEMO]` fixtures) is strictly separated from user data; the API client marks which engine produced each result and fails loudly when a resume is absent.
- **Conformance**: `shared/fixtures/ats_conformance.json` pins section/keyword expectations; backend `pytest` and frontend `vitest` both enforce them (semantic parity).

## Scoring methodology

Weights with job: keyword 0.40 / evidence 0.25 / parseability 0.20 / format 0.15. Without job: evidence 0.40 / parseability 0.35 / format 0.25 (keyword excluded, scored 0). Penalties are documented in-code (e.g. multi-column −25 as *risk*, missing email −30). A bare number without an outcome cue does not count as achievement evidence. Every category returns explanation + limitations in the API payload.

## Factuality guarantees

1. Auto-Fix and LLM paths never introduce emails, phones, companies, dates, degrees, or metrics absent from the source.
2. LLM prompts forbid invention; outputs are schema-validated and metric-gated (unsupported metrics rejected → truthful fallback).
3. Only implemented providers are advertised (`gemini`, `heuristic`); `provider` actually selects behavior.
4. Covered by `backend/tests/test_factuality.py` (10 invariants) which fail loudly on regression.

## Security model

- **Server mode**: prefer `GEMINI_API_KEY` env/secret management (`backend/.env.example`). `GET /api/settings/` returns configured-flags only, never key material. Provider allow-list enforced.
- **Browser-only mode**: any key lives in `localStorage` (XSS-readable by design); the UI states this explicitly. No secrets are logged (Gemini key sent via header, not URL).
- CORS: explicit origins from env; methods limited to GET/POST; uploads capped (`MAX_UPLOAD_BYTES`, default 10 MB) with magic-byte checks.

## Local development

Prereqs: Python 3.12, Node 20+, pnpm.

```bash
./start.sh                 # venv + deps + backend :8000 + frontend :3000
./start.sh --backend-only
./start.sh --frontend-only
```

Manual:
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

Pages hosts only the static standalone app (`frontend/out`). It does not host FastAPI. `deploy-pages.yml` runs lint + typecheck + tests before build; `ci.yml` additionally runs the backend suite on every push/PR.

## Limitations

- Lexical alias matching, not semantic understanding; RELATED matches are down-weighted.
- Layout analysis is heuristic (coordinate grouping); complex designs may still mislead.
- SQLite is single-file local persistence; no migration framework (deterministic `create_all` via `init_db()`; Alembic recommended if the schema grows).
- LLM quality depends on provider availability; offline fallback only rewords, never invents.

## License

MIT — see [LICENSE](LICENSE).
