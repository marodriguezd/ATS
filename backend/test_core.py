import sys
sys.path.insert(0, "./backend")

from app.core.exporter import ATSExporter
from app.core.scorer import ATSScorer
from app.core.ats_parser import ATSParser

sample_cv = {
    "full_name": "Carlos Mendoza",
    "email": "carlos.mendoza@email.com",
    "phone": "+34 612 345 678",
    "location": "Madrid, España",
    "linkedin": "linkedin.com/in/carlosmendoza",
    "github": "github.com/carlosmendoza",
    "summary": "Senior Software Engineer con más de 7 años de experiencia diseñando arquitecturas escalables en la nube.",
    "experience": [
        {
            "role": "Lead Backend Developer",
            "company": "Tech Innovators SL",
            "dates": "2021 - Presente",
            "bullets": [
                "Lideré la migración de microservicios con FastAPI y PostgreSQL, reduciendo la latencia de respuesta en un 35%.",
                "Automaticé pipelines de CI/CD en GitHub Actions procesando más de 50 despliegues semanales con 99.9% de uptime."
            ]
        }
    ],
    "skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "AWS", "CI/CD", "Git"],
    "education": [
        {
            "degree": "Grado en Ingeniería Informática",
            "institution": "Universidad Politécnica de Madrid",
            "year": "2018"
        }
    ]
}

sample_job = """
Buscamos un Senior Backend Developer con experiencia sólida en Python, FastAPI, Docker, PostgreSQL y AWS.
Requisitos:
- Más de 4 años de experiencia en desarrollo backend con Python y microservicios.
- Dominio de bases de datos relacionales (PostgreSQL) y caching con Redis.
- Experiencia demostrable en despliegues en AWS y CI/CD con GitHub Actions.
"""

# 1. Test Text Export
txt = ATSExporter.export_text(sample_cv)
assert "CARLOS MENDOZA" in txt
assert "carlos.mendoza@email.com" in txt

# 2. Test PDF Export
pdf_bytes = ATSExporter.export_pdf(sample_cv)
assert len(pdf_bytes) > 1000

# 3. Test DOCX Export
docx_bytes = ATSExporter.export_docx(sample_cv)
assert len(docx_bytes) > 1000

# 4. Test PDF Parsing through ATSParser
parsed_pdf = ATSParser.parse_pdf(pdf_bytes)
assert parsed_pdf["contact_info"]["email"] == "carlos.mendoza@email.com"

# 5. Test Scorer
score_res = ATSScorer.score_all(parsed_pdf, sample_job)
print("Scorer results:")
print(f"Overall Score: {score_res['overall_score']}/100")
print(f"Breakdown: {score_res['breakdown']}")
print(f"Matched Keywords: {score_res['keyword_details']['matched_keywords']}")
print(f"Missing Keywords: {score_res['keyword_details']['missing_keywords']}")
print(f"Impact Details: {score_res['impact_details']}")
print("ALL CORE TESTS PASSED SUCCESSFULLY!")
