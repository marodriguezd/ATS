# 🎯 ATS Resume Suite

Suite completa para auditoría, optimización y creación de Currículums 100% adaptados a sistemas de seguimiento de candidatos (**ATS** como **Workday, Taleo, Greenhouse, Lever e iCIMS**).

---

## 🌟 Características Principales

1. **Simulador de Parsers ATS Reales**:
   - Detección de maquetación en columnas (que fragmentan y desordenan el flujo de lectura).
   - Detección de tablas y cajas de texto que suelen ser ignoradas o leídas como basura.
   - Visor **"Raw ATS"**: muestra exactamente la secuencia de texto plano que extrae la máquina antes de que ningún humano lea el CV.

2. **Diagnóstico Multidimensional (4 Capas)**:
   - **Parseabilidad**: estructura semántica, encabezados normalizados y datos de contacto legibles.
   - **Match de Palabras Clave**: comparación semántica contra la oferta de empleo (keywords encontradas vs críticas faltantes).
   - **Impacto y Métricas STAR**: detección de verbos de acción y resultados numéricos cuantificables (%, €, multiplicadores).
   - **Formato y Longitud**: adecuación a 1 o 2 páginas estándar.

3. **Optimizador con IA (Fórmula Google XYZ / STAR)**:
   - Transforma viñetas pasivas en logros de alto impacto: *"Logré [X], medido por [Y], implementando [Z]"*.
   - Inyección natural de las palabras clave faltantes de la oferta.
   - Generador de extractos profesionales (Summary) adaptados a la vacante.
   - Compatible con **Google Gemini (por defecto)** y OpenAI.

4. **Creador y Exportador ATS-Friendly**:
   - Constructor visual estructurado.
   - Exportación a **PDF nativo en 1 columna** (sin marcos ni tablas que confundan a los bots).
   - Exportación a **Word (.docx)** editable.
   - Exportación a **Texto Plano / Markdown** para copiar directamente en portales de empleo.

---

## 🚀 Inicio Rápido

### Requisitos
- **Node.js** >= 18 (recomendado v20+)
- **Python** 3.12+
- **pnpm** (o npm)

### 1. Iniciar todo en un solo comando
```bash
./start.sh
```

El script arrancará:
- **Frontend Next.js**: [http://localhost:3000](http://localhost:3000)
- **Backend FastAPI**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Documentación Swagger / OpenAPI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

### 2. Inicio manual de servicios

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

## ⚙️ Configuración de IA (Opcional)

Puedes usar la suite con las heurísticas locales integradas o activar el motor de IA conectando tu clave de Gemini:
- Ve a la pestaña **Ajustes** en la web app e introduce tu `GEMINI_API_KEY` (gratuita en Google AI Studio).
- O define la variable de entorno en tu terminal: `export GEMINI_API_KEY="tu_clave"`.

---

## 📂 Estructura del Proyecto

```
ATS/
├── backend/
│   ├── app/
│   │   ├── api/          # Endpoints (resumes, jobs, audit, settings)
│   │   ├── core/         # Parsers ATS, Scorer 4 capas, Exporter, LLM Engine
│   │   ├── db/           # SQLite & modelos SQLAlchemy
│   │   ├── config.py     # Configuración y variables de entorno
│   │   └── main.py       # Entrada FastAPI con CORS y SQLite
│   ├── requirements.txt
│   └── test_core.py      # Suite de pruebas unitarias
├── frontend/
│   ├── src/
│   │   ├── app/          # App Router Next.js
│   │   ├── components/   # ScoreGauge, RawAtsView, StarOptimizer, BuilderView...
│   │   └── lib/api.ts    # Cliente API
│   └── package.json
└── start.sh              # Script de arranque unificado
```
