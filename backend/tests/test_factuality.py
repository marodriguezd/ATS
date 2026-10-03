"""Factuality invariants: Auto-Fix and LLM fallback must never invent facts."""
import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.auto_fixer import ATSAutoFixer
from app.core.exporter import ATSExporter
from app.core.ats_parser import ATSParser
from app.core.llm_engine import LLMEngine

SOURCE = """Alex Example
alex@example.com | +34 600 111 222

PROFESSIONAL SUMMARY
Backend developer with Python and SQL.

WORK EXPERIENCE
Backend intern | DemoLabs (2023)
* Built REST endpoints with Python.

EDUCATION
Higher Technician in DAM

TECHNICAL SKILLS
Python, SQL
"""


def _parsed():
    return {
        "raw_text": SOURCE,
        "untangled_view": SOURCE,
        "contact_info": {"email": "alex@example.com", "phone": "+34 600 111 222",
                         "linkedin": None, "github": None},
        "sections": ATSParser._extract_sections(SOURCE),
        "formatting_issues": [],
    }


def test_autofix_preserves_missing_as_missing():
    parsed = _parsed()
    del parsed["contact_info"]["phone"]
    result = asyncio.run(ATSAutoFixer.auto_fix_resume(parsed, "Python backend role"))
    clean = result["ats_clean_data"]
    assert clean["phone"] is None
    assert any("phone" in w for w in result["warnings"])


def test_autofix_never_invents_contact_company_metrics():
    result = asyncio.run(ATSAutoFixer.auto_fix_resume(_parsed(), ""))
    clean = result["ats_clean_data"]
    assert clean["email"] == "alex@example.com"
    assert "miguadali" not in str(clean).lower()
    assert "goldenmac" not in str(clean).lower()
    assert "99%" not in str(clean)
    assert "Empresa Tecnológica" not in str(clean)


def test_llm_fallback_never_fabricates_metrics():
    out = LLMEngine._fallback_star_rewrite("Built REST endpoints with Python.", ["Python"])
    assert "25%" not in out["improved_star"]
    assert "35%" not in out["improved_star"]
    assert "[missing metric" in out["formula_breakdown"]["measurement_y"]


def test_llm_rejects_hallucinated_metric():
    bad = {"original": "x", "improved_star": "Did x, improving efficiency by 25%",
           "formula_breakdown": {}}
    assert LLMEngine._validate_bullet_result(bad, "Did x.") is None


def test_export_reparse_preserves_facts():
    data = {
        "full_name": "Alex Example", "email": "alex@example.com", "phone": "+34 600 111 222",
        "summary": "Backend developer with Python and SQL.",
        "experience": [{"role": "Backend intern", "company": "DemoLabs",
                        "dates": "2023", "bullets": ["Built REST endpoints with Python."]}],
        "skills": ["Python", "SQL"],
        "education": [{"degree": "Higher Technician in DAM", "institution": "Demo Institute",
                       "year": "2023", "notes": ""}],
        "certifications": [],
    }
    reparsed = ATSParser.parse_plain_text(ATSExporter.export_text(data))
    assert reparsed["contact_info"]["email"] == "alex@example.com"
    assert reparsed["contact_info"]["phone"] == "+34 600 111 222"
    assert "experience" in reparsed["sections"]
    assert "education" in reparsed["sections"]
