"""Robust normalized section-header detection (ES/EN, accent-insensitive).

Uses normalized EXACT header matching with a small controlled fuzzy
allowance (punctuation/whitespace/case/accents) instead of vague
substring regexes. In particular ``experience`` and ``projects`` are
disjoint alias sets so project headings are never classified as
employment history.
"""
from __future__ import annotations

import re
import unicodedata

SECTION_ALIASES: dict[str, list[str]] = {
    "experience": [
        "experience", "work experience", "professional experience",
        "employment", "employment history", "work history",
        "experiencia", "experiencia laboral", "experiencia profesional",
        "historial laboral", "trayectoria profesional",
    ],
    "projects": [
        "projects", "technical projects", "selected projects",
        "personal projects", "proyectos", "proyectos tecnicos",
        "proyectos destacados",
    ],
    "education": [
        "education", "academic background", "studies",
        "formacion", "formacion academica", "educacion", "estudios",
    ],
    "skills": [
        "skills", "technical skills", "competencies", "abilities",
        "habilidades", "habilidades tecnicas", "competencias",
        "conocimientos", "tecnologias",
    ],
    "summary": [
        "summary", "about me", "profile", "perfil", "extracto",
        "resumen", "perfil profesional", "professional summary",
    ],
    "certifications": [
        "certifications", "courses", "certificaciones", "cursos",
        "licencias", "licenses",
    ],
    "languages": ["languages", "idiomas"],
}


def _normalize_header(line: str) -> str:
    text = unicodedata.normalize("NFD", line.strip().lower())
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = re.sub(r"[^a-z0-9 ]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


# Pre-normalized lookup: normalized alias -> canonical section
_NORMALIZED_INDEX: dict[str, str] = {}
for _section, _aliases in SECTION_ALIASES.items():
    for _alias in _aliases:
        _NORMALIZED_INDEX[_normalize_header(_alias)] = _section


def detect_section_header(line: str) -> str | None:
    """Return canonical section key if the line is a section header."""
    trimmed = line.strip()
    if not trimmed or len(trimmed) > 48:
        return None
    # Headers are short; reject sentence-like lines with many words.
    if len(trimmed.split()) > 4:
        return None
    return _NORMALIZED_INDEX.get(_normalize_header(trimmed))


def extract_sections(text: str) -> dict[str, str]:
    lines = text.split("\n")
    hits: list[tuple[int, str]] = []
    for i, line in enumerate(lines):
        section = detect_section_header(line)
        if section is not None:
            # Last header wins if duplicated; keep first occurrence order.
            if hits and hits[-1][1] == section and hits[-1][0] == i - 1:
                continue
            hits.append((i, section))
    sections: dict[str, str] = {}
    for idx, (line_no, name) in enumerate(hits):
        end = hits[idx + 1][0] if idx + 1 < len(hits) else len(lines)
        content = "\n".join(lines[line_no + 1 : end]).strip()
        if name in sections and sections[name]:
            sections[name] = (sections[name] + "\n" + content).strip()
        else:
            sections[name] = content
    return sections
