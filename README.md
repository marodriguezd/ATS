# 🎯 ATS Resume Suite

Suite de alto rendimiento para auditoría, optimización y reconstrucción de Currículums 100% compatibles con filtros **ATS** (**Workday, Taleo, Greenhouse, Lever, iCIMS y SAP SuccessFactors**).

[![Deploy Next.js to GitHub Pages](https://github.com/marodriguezd/ATS/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/marodriguezd/ATS/actions/workflows/deploy-pages.yml)
[![Demo en Vivo](https://img.shields.io/badge/Demo-GitHub%20Pages-emerald?style=flat&logo=github)](https://marodriguezd.github.io/ATS/)

---

## 🌟 Características Clave

1. **Simulador de Parsers ATS Reales y Visor Dual**:
   - **Modo Entrelazado (Lo que lee un ATS roto)**: simula cómo un parser desordena un PDF maquetado en 2 columnas o con tablas invisibles.
   - **Modo Reconstruido**: lectura humana limpia ordenada por coordenadas espaciales.

2. **Diagnóstico Multidimensional (4 Capas - 0 a 100)**:
   - **Parseabilidad**: detección de secciones estándar (`Experiencia`, `Educación`, `Habilidades`, `Proyectos`), datos de contacto legibles y encabezados normalizados.
   - **Match de Palabras Clave**: motor de sinónimos semánticos acento-insensibles (`DAM` = `Desarrollo de Aplicaciones Multiplataforma`, `Postgres` = `PostgreSQL`, `K8s` = `Kubernetes`, `CI/CD` = `Integración continua`). Ponderación 70% en Experiencia/Proyectos vs 30% en listados de habilidades.
   - **Métricas STAR e Impacto (Fórmula Google XYZ)**: detección de verbos de acción y cuantificadores numéricos (%, €, multiplicadores, volúmenes de usuarios).
   - **Formato y Densidad**: análisis de páginas, recuento óptimo de palabras y ausencia de elementos bloqueantes.

3. **1-Click Auto-Fixer ("Convertir a 100% ATS Friendly")**:
   - Reorganiza cualquier CV fragmentado en una jerarquía lineal limpia de una sola columna sin alterar tu historial verídico.
   - Eleva puntuaciones de 40-50% a **80-100%** de forma determinista.

4. **Perfiles y Ofertas DAM / Desarrollador Junior Integrados**:
   - **Alejandro Navarro**: DAM - Backend Java & Spring Boot Junior (83% match).
   - **Laura Gómez**: DAM - Mobile Android & Kotlin Junior.
   - **David Morales**: DAM / DAW - Fullstack React & Python Junior.
   - **Miguel Ángel Rodríguez**: Caso real analizado y optimizado.
   - **Carlos Mendoza**: Senior Software Engineer.

5. **Exportador Nativo Certificado para ATS**:
   - **PDF 1 Columna**: ReportLab con jerarquía tipográfica limpia y glifos estándar seguros (evita problemas de `(cid:127)`).
   - **Word (.docx)**: márgenes estándar de 0.5" y estructura parseable.
   - **Texto Plano / Markdown**: listo para copiar y pegar directamente en formularios de empleo.

---

## 🌐 Demo en GitHub Pages

Puedes acceder a la versión desplegada en:
👉 **[https://marodriguezd.github.io/ATS/](https://marodriguezd.github.io/ATS/)**

---

## 🚀 Inicio Rápido Local

### Requisitos
- **Node.js** >= 18 (recomendado v20+)
- **Python** 3.12
- **pnpm** (o npm)

### 1. Iniciar todo en un solo comando
```bash
./start.sh
```

Servicios levantados:
- **Frontend Next.js**: [http://localhost:3000](http://localhost:3000)
- **Backend FastAPI**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Documentación Swagger / OpenAPI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

### 2. Inicio manual paso a paso

**Backend:**
```bash
python3.12 -m venv backend/venv
./backend/venv/bin/pip install -r backend/requirements.txt
./backend/venv/bin/uvicorn app.main:app --app-dir ./backend --host 0.0.0.0 --port 8000 --reload
```

**Frontend:**
```bash
pnpm --prefix frontend dev
```

---

## 🧪 Ejecutar Tests

Suite de pruebas end-to-end (motor de sinónimos, spatial untangler, auto-fixer y exportadores):
```bash
PYTHONPATH=./backend ./backend/venv/bin/python backend/test_e2e_advanced.py
```

---

## ⚙️ Configuración de IA (Opcional)

La suite funciona de forma autónoma con heurísticas algorítmicas sin coste. Si deseas reescritura asistida por LLM:
1. Ve a la pestaña **Ajustes** en la aplicación web.
2. Introduce tu clave de **Google Gemini** (gratuita en [Google AI Studio](https://aistudio.google.com/)) u OpenAI.
3. Se almacena localmente de forma segura.

---

## 📂 Estructura del Repositorio

```
ATS/
├── .github/workflows/deploy-pages.yml   # Despliegue CI/CD automático en GitHub Pages
├── backend/
│   ├── app/
│   │   ├── api/          # Endpoints (audit, resumes, jobs, settings)
│   │   ├── core/         # ats_parser, column_untangler, scorer, synonyms, exporter, auto_fixer
│   │   ├── db/           # Modelos SQLAlchemy y sesión SQLite
│   │   └── main.py       # API FastAPI con CORS
│   ├── requirements.txt
│   └── test_e2e_advanced.py
├── frontend/
│   ├── src/
│   │   ├── app/          # Next.js App Router (Turbopack)
│   │   ├── components/   # AuditView, RawAtsView, StarOptimizer, BuilderView, ScoreGauge
│   │   └── lib/api.ts    # Cliente HTTP y tipos TypeScript
│   ├── next.config.ts    # Soporte exportación estática y dev proxy
│   └── package.json
├── ABOUT.md              # Documentación técnica en profundidad
├── README.md
└── start.sh
```

---

## 📄 Licencia

Distribuido bajo la Licencia MIT. Consulta [LICENSE](LICENSE) para más información.
