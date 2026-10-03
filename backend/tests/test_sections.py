"""Section detection: exact normalized headers; experience != projects."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.sections import detect_section_header, extract_sections


def test_experience_and_projects_are_disjoint():
    text = "WORK EXPERIENCE\nDid backend work.\n\nPROJECTS\nBuilt a demo app."
    sections = extract_sections(text)
    assert "experience" in sections
    assert "projects" in sections
    assert "demo app" in sections["projects"].lower()
    assert "demo app" not in sections["experience"].lower()


def test_proyectos_not_classified_as_experience():
    assert detect_section_header("Proyectos") == "projects"
    assert detect_section_header("Proyectos Técnicos") == "projects"
    assert detect_section_header("Experiencia Laboral") == "experience"


def test_bilingual_accents_and_case():
    assert detect_section_header("FORMACIÓN ACADÉMICA") == "education"
    assert detect_section_header("Habilidades Técnicas") == "skills"
    assert detect_section_header("  resumen  ") == "summary"


def test_long_sentence_lines_are_not_headers():
    assert detect_section_header("I have experience with Python and Docker in production") is None
    assert detect_section_header("") is None


def test_adversarial_headers():
    text = "EXPERIENCE!\nWork here.\n\n  proyectos destacados: \nDemo."
    sections = extract_sections(text)
    assert "experience" in sections
    assert "projects" in sections
