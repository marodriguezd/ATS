import sys
sys.path.insert(0, "./backend")

import sqlite3
import json
from app.core.exporter import ATSExporter
from app.core.scorer import ATSScorer

SAMPLE_PROFILES = [
    {
        "title": "Alejandro Navarro (DAM - Backend Java & Spring Boot Junior)",
        "full_name": "Alejandro Navarro Santos",
        "email": "alejandro.navarro@email.com",
        "phone": "+34 654 321 098",
        "location": "Valencia, España",
        "linkedin": "linkedin.com/in/alejandronavarro",
        "github": "github.com/alejandronavarro",
        "summary": "Desarrollador Backend Junior graduado en DAM con sólida formación en Java, Spring Boot y diseño de bases de datos relacionales SQL. Experiencia práctica en la implementación de APIs RESTful, control de versiones con Git y pruebas unitarias con JUnit.",
        "experience": [
            {
                "role": "Desarrollador Java Junior (Prácticas FCT)",
                "company": "InnoSoft Levante",
                "dates": "Marzo 2023 - Junio 2023",
                "location": "Valencia, España",
                "bullets": [
                    "Desarrollé microservicios RESTful con Spring Boot y JPA/Hibernate para la gestión de usuarios, reduciendo tiempos de consulta en un 25%.",
                    "Diseñé esquemas relacionales y consultas optimizadas en PostgreSQL y MySQL con más de 10k registros.",
                    "Implementé pruebas unitarias con JUnit y Mockito, alcanzando una cobertura de código del 80% en los módulos críticos."
                ]
            },
            {
                "role": "Proyecto Final de Grado DAM: Sistema de Gestión Hospitalaria",
                "company": "Proyecto Académico ITEP",
                "dates": "2023",
                "location": "Valencia, España",
                "bullets": [
                    "Diseñé una aplicación cliente-servidor completa con JavaFX y backend Spring Boot con autenticación segura JWT.",
                    "Desplegué la arquitectura en contenedores Docker y configuré pipelines de integración continua con GitHub Actions."
                ]
            }
        ],
        "skills": ["Java", "Spring Boot", "JPA/Hibernate", "SQL", "PostgreSQL", "MySQL", "APIs REST", "Docker", "Git", "GitHub", "JUnit", "Maven"],
        "education": [
            {
                "degree": "Técnico Superior en Desarrollo de Aplicaciones Multiplataforma (DAM)",
                "institution": "Centro Oficial FP",
                "year": "2021 - 2023",
                "notes": "Programación orientada a objetos, bases de datos relacionales y desarrollo de interfaces."
            }
        ],
        "certifications": ["Certificación Java SE 17 Developer — Oracle (2024)"]
    },
    {
        "title": "Laura Gómez (DAM - Desarrolladora Mobile & Android Junior)",
        "full_name": "Laura Gómez Pardo",
        "email": "laura.gomez.dev@email.com",
        "phone": "+34 687 456 123",
        "location": "Barcelona, España",
        "linkedin": "linkedin.com/in/lauragomezdev",
        "github": "github.com/lauragomezdev",
        "summary": "Desarrolladora Mobile Junior graduada en DAM especializada en el ecosistema Android con Kotlin y Java. Experiencia implementando arquitecturas limpias MVVM, integración con Firebase y persistencia local con Room / SQLite.",
        "experience": [
            {
                "role": "Desarrolladora Android Junior",
                "company": "AppCraft Studios",
                "dates": "2023 - 2024",
                "location": "Barcelona, España",
                "bullets": [
                    "Diseñé e implementé pantallas nativas en Kotlin utilizando Jetpack Compose y arquitectura recomendada MVVM.",
                    "Integré servicios de autenticación y notificaciones push con Firebase Cloud Messaging para más de 5,000 usuarios activos.",
                    "Optimicé la capa de base de datos local con Room SQLite, reduciendo el consumo de memoria en un 30%."
                ]
            },
            {
                "role": "Proyecto Android DAM: App de Rutas y Senderismo",
                "company": "Proyecto FCT DAM",
                "dates": "2023",
                "location": "Barcelona, España",
                "bullets": [
                    "Desarrollé una app nativa con geolocalización GPS e integración con Google Maps API y Retrofit para consumo de APIs REST.",
                    "Publiqué la aplicación en Google Play Store con más de 1,000 descargas y valoración media de 4.6 estrellas."
                ]
            }
        ],
        "skills": ["Kotlin", "Java", "Android SDK", "Jetpack Compose", "MVVM", "Room", "SQLite", "Firebase", "APIs REST", "Retrofit", "Git", "GitHub"],
        "education": [
            {
                "degree": "Técnico Superior en Desarrollo de Aplicaciones Multiplataforma (DAM)",
                "institution": "Institut d'Educació Secundària",
                "year": "2021 - 2023",
                "notes": "Programación móvil nativa, sistemas de gestión empresarial y desarrollo multiplataforma."
            }
        ],
        "certifications": ["Android Certified Application Developer — Android ATC (2024)"]
    },
    {
        "title": "David Morales (DAM / DAW - Fullstack Junior Python & React)",
        "full_name": "David Morales Quintana",
        "email": "david.morales.code@email.com",
        "phone": "+34 611 987 654",
        "location": "Madrid, España",
        "linkedin": "linkedin.com/in/davidmoralesq",
        "github": "github.com/davidmoralesq",
        "summary": "Desarrollador Fullstack Junior con doble titulación DAM / DAW. Especializado en backend ágil con Python (FastAPI/Django) y frontend interactivo con React y TypeScript. Pasión por la contenedorización con Docker y el código limpio.",
        "experience": [
            {
                "role": "Desarrollador Fullstack Junior",
                "company": "CloudSprint Tech",
                "dates": "2023 - Presente",
                "location": "Madrid, España",
                "bullets": [
                    "Desarrollé APIs RESTful de alta velocidad con FastAPI y PostgreSQL, logrando tiempos de respuesta inferiores a 100ms.",
                    "Construí interfaces de usuario modulares y reactivas con React, TypeScript y Tailwind CSS para paneles de control analíticos.",
                    "Automaticé entornos de desarrollo mediante Docker Compose y despliegues automáticos con GitHub Actions."
                ]
            }
        ],
        "skills": ["Python", "FastAPI", "React", "TypeScript", "JavaScript", "SQL", "PostgreSQL", "Docker", "Git", "GitHub", "APIs REST", "Tailwind CSS"],
        "education": [
            {
                "degree": "Doble Grado Superior DAM y DAW",
                "institution": "Centro Superior de Informática de Madrid",
                "year": "2020 - 2023",
                "notes": "Desarrollo multiplataforma y desarrollo web, arquitecturas cliente-servidor y seguridad web."
            }
        ],
        "certifications": ["Docker Certified Associate Preparation — Linux Foundation (2024)"]
    }
]

conn = sqlite3.connect("ats_suite.db")
cursor = conn.cursor()

job_java = """Buscamos un Desarrollador Backend Junior Java con conocimientos de Spring Boot, SQL (MySQL o PostgreSQL), APIs REST y Git.
Requisitos:
- Formación en DAM o Ingeniería Informática.
- Experiencia en desarrollo con Java y Spring Boot.
- Manejo de bases de datos relacionales y control de versiones con Git."""

job_mobile = """Buscamos Desarrollador Android Junior con conocimientos de Kotlin, Java, Android SDK y SQLite.
Requisitos:
- Grado Superior en DAM.
- Experiencia con Kotlin, consumo de APIs REST y persistencia local (Room o SQLite).
- Valorable experiencia con Firebase y Git."""

for profile in SAMPLE_PROFILES:
    raw_text = ATSExporter.export_text(profile)
    cursor.execute("""
    INSERT INTO resumes (title, file_type, raw_text, parsed_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    """, (profile["title"], "json", raw_text, json.dumps(profile)))
    resume_id = cursor.lastrowid

    # Format score input
    exp_combined = "\n".join([f"{e['role']} {e['company']}\n" + "\n".join(e['bullets']) for e in profile["experience"]])
    score_input = {
        "raw_text": raw_text,
        "total_pages": 1,
        "is_multi_column": False,
        "has_tables": False,
        "contact_info": {
            "email": profile["email"],
            "phone": profile["phone"],
            "location": profile["location"],
            "linkedin": profile["linkedin"],
            "github": profile["github"]
        },
        "sections": {
            "summary": profile["summary"],
            "experience": exp_combined,
            "skills": ", ".join(profile["skills"]),
            "education": "\n".join([f"{ed['degree']} {ed['institution']}" for ed in profile["education"]]),
            "certifications": "\n".join(profile.get("certifications", []))
        },
        "formatting_issues": []
    }

    # Score
    target_job = job_mobile if "Android" in profile["title"] else job_java
    score = ATSScorer.score_all(score_input, target_job)

    cursor.execute("""
    INSERT INTO analyses (resume_id, overall_score, parseability_score, keyword_match_score, impact_score, format_score, raw_ats_view, analysis_details_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    """, (resume_id, score["overall_score"], score["breakdown"]["parseability"], score["breakdown"]["keyword_match"], score["breakdown"]["impact"], score["breakdown"]["format"], raw_text, json.dumps(score)))

    print(f"✓ Guardado: {profile['title']} (ID: {resume_id}, Score: {score['overall_score']}/100)")

conn.commit()
conn.close()
print("¡Todos los ejemplos de DAM y Junior guardados en SQLite con éxito!")
