import sys
sys.path.insert(0, "./backend")

import httpx
from app.core.synonyms import match_keyword_semantically, get_canonical
from app.core.ats_parser import ATSParser
from app.core.exporter import ATSExporter

print("--- 1. Testing Synonyms Engine ---")
assert match_keyword_semantically("postgresql", "Experiencia sólida en bases de datos relacionales Postgres.")
assert match_keyword_semantically("kubernetes", "Despliegues en K8s con Helm.")
assert match_keyword_semantically("dam", "Grado Superior en Desarrollo de Aplicaciones Multiplataforma.")
assert match_keyword_semantically("ci/cd", "Automatización de integración continua.")
print("✓ Synonyms engine: All semantic matches passed!")

print("\n--- 2. Testing HTTP Endpoints ---")
with httpx.Client(base_url="http://127.0.0.1:8000/api") as client:
    # 1. Health
    res_root = client.get("/")
    # 2. Resumes list
    res_list = client.get("/resumes/")
    assert res_list.status_code == 200
    resumes = res_list.json()
    print(f"✓ Found {len(resumes)} resumes in database.")

    # 3. Test Auto-Fix endpoint on Resume 1 (Miguel Ángel's original CV)
    target_job = """Buscamos un Desarrollador Backend Junior / Python con conocimientos de Java, Spring Boot, APIs REST, SQL y Docker.
Requisitos:
- Formación en DAM, DAW o Ingeniería Informática.
- Experiencia en desarrollo con Python o Java (Spring Boot).
- Manejo de bases de datos relacionales (PostgreSQL o MySQL).
- Conocimientos de Git, Docker y entornos Linux.
- Valorable interés o formación en Cloud (AWS) y Data / Inteligencia Artificial."""

    res_fix = client.post("/audit/auto-fix", json={
        "resume_id": 1,
        "job_text": target_job
    })
    assert res_fix.status_code == 200
    fix_data = res_fix.json()
    print(f"✓ Auto-Fix executed successfully!")
    print(f"  New Resume ID: {fix_data['new_resume_id']}")
    print(f"  New Title: {fix_data['new_title']}")
    print(f"  Perfected Score: {fix_data['perfected_score']['overall_score']}/100")
    print(f"  Breakdown: {fix_data['perfected_score']['breakdown']}")

    # 4. Test Export PDF & DOCX of the new resume
    new_id = fix_data["new_resume_id"]
    pdf_resp = client.get(f"/resumes/{new_id}/export/pdf")
    assert pdf_resp.status_code == 200
    assert len(pdf_resp.content) > 1000

    docx_resp = client.get(f"/resumes/{new_id}/export/docx")
    assert docx_resp.status_code == 200
    assert len(docx_resp.content) > 1000

    print("✓ Exports (PDF & DOCX) generated cleanly over HTTP!")

print("\nALL ADVANCED E2E TESTS PASSED WITH 100% SUCCESS!")
