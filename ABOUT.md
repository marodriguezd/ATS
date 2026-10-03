# About ATS Resume Suite

Live app (static standalone build): https://marodriguezd.github.io/ATS/

## What this tool is

A transparent, heuristic **ATS-readability analyzer**: it examines document structure, extraction order, keyword alignment, evidence quality, and formatting risk, and explains each finding with observations and limitations. Scores are internal heuristics (0–100 per category), **not** predictions about Workday, Taleo, Greenhouse, Lever, iCIMS, or SAP SuccessFactors, whose internals are proprietary and vary by employer configuration.

## What it is not

- Not a reproduction or simulation of any vendor ATS.
- Not a source of rejection statistics or universal compatibility guarantees.
- Not a generator of employment history: it reorganizes and normalizes existing information only.

## How analysis works

1. **Ingestion/extraction**: PDF (pdfplumber with pypdf fallback), DOCX, TXT. Layout signals: multi-column reading-order risk, data tables, page count.
2. **Section detection** (`backend/app/core/sections.py`, `frontend/src/lib/domain.ts`): normalized exact-header matching across ES/EN aliases (accents, case, punctuation tolerant). `experience` and `projects` are disjoint; project work is never merged into employment history.
3. **Contact detection**: email plus digit-validated phones (8–15 digits; years like 2023 do not match), LinkedIn/GitHub handles.
4. **Job-description analysis**: splits REQUIRED / PREFERRED / CONTEXTUAL zones (e.g. "nice to have" / "se valorará" sections), then emits prioritized keyword signals — fewer, higher-value terms instead of raw frequency.
5. **Keyword normalization** (lexical, not NLP): canonical forms with match classes EXACT / ALIAS / NORMALIZED / RELATED / ABSENT. Precision rules: `Git` ≠ `GitHub`, `CI` ≠ `CI/CD`; short aliases require strict token boundaries. Weights: REQUIRED 1.0, PREFERRED 0.7, CONTEXTUAL 0.5; evidence in Experience/Projects outranks skills-only mentions.
6. **Evidence analysis**: action-verb-led bullets plus numbers tied to outcome cues (%, currency, multipliers with context). Bare numbers (years, counts without outcomes) do not count as achievements.
7. **Scoring**: with job → keyword 0.40 / evidence 0.25 / parseability 0.20 / format 0.15; without job → evidence 0.40 / parseability 0.35 / format 0.25. Each category ships explanation + limitations in the API response (`methodology_note`).
8. **Safe transformation (Auto-Fix)**: SOURCE → TRANSFORM → FACTUAL CONSISTENCY CHECK → ACCEPT. Missing data yields warnings ("Missing data: … could not be recovered"), never fabricated PII, companies, dates, degrees, or metrics.
9. **Export**: canonical A4 single-column model (Name → Contact → Summary → Experience → Skills → Education → Certifications), no tables, escaped text, Unicode-safe. Export→re-parse is tested: name, email, phone, links, and sections must survive.

## LLM behavior

Optional Gemini-assisted rewriting under strict prompts (no invented metrics, employers, dates, technologies). Responses are schema-validated; outputs introducing unsupported metrics are rejected in favor of a deterministic fallback that only improves wording and marks missing evidence as `[missing …]`. Only `gemini` and `heuristic` providers exist; `provider` genuinely selects behavior. Keys travel via header (not URL) and are never logged; the server never returns key material.

## Security model

- Server mode: keys preferably from environment (`backend/.env.example`); DB storage only if explicitly configured. CORS uses explicit origins, GET/POST only, no credentials wildcard. Uploads validated by extension, magic bytes, size cap, and UTF-8 checks.
- Browser-only mode: localStorage holds resumes and optionally a user-supplied key; the UI discloses that this storage is XSS-readable and offers no server-grade protection.

## Testing & deployment

- Backend: `pytest` (unit, parser/scorer, factuality invariants, API workflow, export round-trip).
- Frontend: `vitest` (domain + cross-engine conformance against `shared/fixtures/ats_conformance.json`), `tsc --noEmit`, `eslint`, production `next build`.
- CI (`.github/workflows/ci.yml`) runs both suites; Pages deployment gates on frontend verification and hosts only the static standalone app.

## Known limitations

Lexical (not semantic) matching; heuristic layout analysis; length/section heuristics are guidance, not quality judgments; SQLite without a migration framework (deterministic `init_db()`; adopt Alembic if the schema grows); LLM output quality depends on provider availability.
