"""Canonical domain specification for the ATS-readability engine.

Single source of truth for behaviour shared by the Python backend
and the TypeScript standalone (browser) engine. Both implementations
MUST conform to this spec; see ``shared/fixtures/ats_conformance.json``
for executable test vectors.

Pipeline stages:
  Document ingestion -> Text extraction -> Structural normalization ->
  Section detection -> Contact detection -> Layout analysis ->
  Job-description analysis -> Keyword normalization -> Evidence matching ->
  Audit scoring -> Recommendations -> Safe transformation -> Export

Key invariants:
  - Never invent factual content (employers, dates, degrees, contact,
    metrics, technologies). Missing data stays missing with a warning.
  - Scores are heuristic audit signals (0-100 per category), NOT
    probabilities of acceptance by any proprietary ATS product.
  - Backend and standalone engines must produce equivalent section
    detection, keyword normalization/matching, coverage and score
    categories for the same input (semantic parity).
"""
from __future__ import annotations

from typing import Literal, TypedDict

# Canonical section keys
SectionKey = Literal[
    "experience", "projects", "education", "skills",
    "summary", "certifications", "languages",
]

CATEGORY_WEIGHTS_WITH_JOB = {
    "keyword_match": 0.40,
    "evidence": 0.25,       # impact / evidence strength
    "parseability": 0.20,
    "format": 0.15,
}

CATEGORY_WEIGHTS_NO_JOB = {
    "evidence": 0.40,
    "parseability": 0.35,
    "format": 0.25,
}

# Match classes for keyword evidence (precision-first, documented).
MatchClass = Literal["EXACT", "ALIAS", "NORMALIZED", "RELATED", "DERIVED", "ABSENT"]


class KeywordMatch(TypedDict):
    keyword: str
    canonical: str
    match_class: str
    section: str  # experience | skills_only | raw_only | absent


class Recommendation(TypedDict):
    category: str
    priority: str  # Critica | Alta | Media | Baja
    action: str
