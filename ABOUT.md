# 📖 Acerca de ATS Resume Suite (ABOUT)

<div align="center">

## 🚀 [CLIC AQUÍ PARA ABRIR LA APP EN VIVO](https://marodriguezd.github.io/ATS/)

[![Abrir ATS Resume Suite](https://img.shields.io/badge/ACCESO%20DIRECTO%20WEB-https%3A%2F%2Fmarodriguezd.github.io%2FATS%2F-059669?style=for-the-badge&logo=googlechrome&logoColor=white)](https://marodriguezd.github.io/ATS/)
[![Ver Código en GitHub](https://img.shields.io/badge/REPOSITORIO%20GITHUB-marodriguezd%2FATS-2563eb?style=for-the-badge&logo=github)](https://github.com/marodriguezd/ATS)

🔗 **URL Directa**: [https://marodriguezd.github.io/ATS/](https://marodriguezd.github.io/ATS/)

</div>

---

## ¿Por qué existe esta herramienta?

Más del **75% de los currículums son descartados automáticamente** por sistemas ATS (*Applicant Tracking Systems*) como **Workday, Taleo, Greenhouse, Lever, iCIMS o SAP SuccessFactors** antes de que un reclutador o líder técnico llegue a verlos.

Muchos candidatos cualificados —especialmente estudiantes de ciclos formativos como **DAM (Desarrollo de Aplicaciones Multiplataforma)**, **DAW (Desarrollo de Aplicaciones Web)** o desarrolladores junior— son eliminados del proceso de selección por errores invisibles de formato y procesamiento informático.

**ATS Resume Suite** fue diseñada para hacer visible lo que las máquinas ven, diagnosticar cada fallo y proporcionar una solución con un solo clic.

---

## 🔍 Anatomía del Problema ATS

### 1. El mito del diseño visual en Canva / Photoshop
Las plantillas visuales con barras laterales, dos columnas, iconos gráficos, tablas y cajas de texto flotantes lucen atractivas para el ojo humano, pero son **catastróficas para los extractores de texto**:
- Los archivos PDF almacenan texto como secuencias de comandos posicionales (`BT ... ET`), no como párrafos continuos.
- Cuando un motor ATS básico extrae el texto de un diseño en dos columnas, lee horizontalmente a través de la página:
  ```text
  EXPERIENCIA LABORAL          DATOS DE CONTACTO
  Desarrollador Junior         Email: dev@ejemplo.com
  Tech Solutions (2023)        Tel: +34 600 000 000
  ```
  El ATS lo lee como una sola frase ininteligible:
  ```text
  EXPERIENCIA LABORAL DATOS DE CONTACTO Desarrollador Junior Email: dev@ejemplo.com Tech Solutions (2023) Tel: +34 600 000 000
  ```
- El resultado: el parser no encuentra ni las fechas de experiencia ni los datos de contacto, asignando un **score de parseabilidad de 0**.

### 2. Tablas y cajas de texto
Casi ningún ATS indexa el contenido ubicado dentro de cabeceras, pies de página o cajas flotantes de Microsoft Word o PDF. Si tu teléfono o titulación está en el pie de página, para el sistema no existes.

### 3. Falsos negativos de palabras clave por sinónimos
Si la oferta pide *"Desarrollo de Aplicaciones Multiplataforma"* y tu CV indica *"DAM"*, o si piden *"PostgreSQL"* y pusiste *"Postgres"*, los parsers tradicionales sin matching semántico descartan la candidatura por falta de coincidencia textual estricta.

---

## ⚙️ Arquitectura del Motor de Auditoría (4 Capas)

El motor evalúa cada currículum sobre 100 puntos distribuidos en 4 dimensiones críticas:

```
[ Puntuación Global (0-100) ]
        ├── 1. Parseabilidad (Peso: 30%)
        ├── 2. Match de Palabras Clave (Peso: 35%)
        ├── 3. Impacto y Fórmula STAR (Peso: 20%)
        └── 4. Formato y Densidad (Peso: 15%)
```

### Capa 1: Parseabilidad (0 - 100)
- **Extracción Dual**: `pdfplumber` analiza las coordenadas `(x0, top, x1, bottom)` de cada carácter y detecta la existencia de canalones (*gutters*) de texto.
- **Normalización de Secciones**: mapeo determinista mediante expresiones regulares de encabezados estándar:
  - Experiencia / Trayectoria Profesional / Work History
  - Educación / Formación Académica / Estudios
  - Habilidades / Competencias / Stack Tecnológico / Skills
  - Proyectos / Portfolio
  - Resumen Profesional / Perfil
- **Validación de Contacto**: comprobación de email RFC-compliant, teléfono y enlaces (LinkedIn / GitHub).

### Capa 2: Match de Palabras Clave Semánticas (0 - 100)
- **Diccionario de Sinónimos Bidireccional**: normaliza acentos y equivalencias del sector tecnológico español e internacional:
  - `DAM` ↔ `Desarrollo de Aplicaciones Multiplataforma`
  - `DAW` ↔ `Desarrollo de Aplicaciones Web`
  - `K8s` ↔ `Kubernetes`
  - `Postgres` ↔ `PostgreSQL`
  - `JS` ↔ `JavaScript`
  - `TS` ↔ `TypeScript`
  - `CI/CD` ↔ `Integración continua`
- **Ponderación por Contexto (70/30)**: una palabra clave demostrada dentro de la sección de **Experiencia o Proyectos** vale un 70% de la nota, mientras que una palabra mencionada solo en la lista de habilidades vale un 30%. Esto evita el truco del *"keyword stuffing"* que penalizan los ATS modernos.

### Capa 3: Impacto y Fórmula Google XYZ / STAR (0 - 100)
Evalúa si los logros del candidato responden a la fórmula oficial de contratación técnica de Google:
> *"Conseguí [X], medido por [Y], haciendo [Z]"*
- Detección de **verbos de acción** en pasado/presente enérgico: *Lideré, Optimicé, Desarrollé, Reduje, Automaticé, Desplegué*.
- Detección de **métricas numéricas cuantificables**: porcentajes (%), cifras monetarias (€, $), multiplicadores (*2x, 3x*), latencias (*ms, seg*) y escalas de usuarios.

### Capa 4: Formato y Densidad (0 - 100)
- Control estricto de extensión: 1 página para perfiles junior/DAM (350 - 650 palabras), máximo 2 páginas para seniors (700 - 1200 palabras).
- Detección de errores de codificación tipográfica y caracteres especiales incompatibles.

---

## 🛠️ El Auto-Fixer de 1 Clic

Cuando un currículum obtiene una puntuación baja por culpa de maquetación en columnas o desorden de secciones:
1. El algoritmo extrae el contenido estructurado de cada sección sin alterar la información verídica del usuario.
2. Deshace las columnas aplicando el algoritmo de desenredo espacial (*spatial untangler*).
3. Reubica la información en el orden cronológico y jerárquico estándar requerido por Workday y Taleo:
   `Nombre y Contacto → Resumen Profesional → Experiencia → Proyectos → Educación → Habilidades`.
4. El resultado genera una versión con **100% de parseabilidad y puntuaciones superiores al 80%**.

---

## 📤 Exportación Certificada para ATS

- **PDF en 1 Columna**: maquetado con ReportLab usando tipografías estándar (*Helvetica / Helvetica-Bold*), márgenes simétricos de 0.5 pulgadas y glifos estándar con entidad HTML `&bull;` que no generan basura unicode `(cid:127)`.
- **Microsoft Word (.docx)**: documento nativo con estilos limpios sin tablas ocultas.
- **Texto Plano (.txt)**: optimizado para portales de empleo con cajas de texto de entrada manual.

---

## 👥 Perfiles DAM y Junior Incluidos

La suite incorpora casos de estudio reales para validar y comparar currículums:
- **DAM Backend Java**: Alejandro Navarro (Java 17, Spring Boot, Hibernate, MySQL, Docker, JUnit).
- **DAM Mobile Android**: Laura Gómez (Kotlin, Android SDK, Room, Retrofit, MVVM).
- **DAM/DAW Fullstack**: David Morales (React, TypeScript, FastAPI, PostgreSQL, Tailwind).
- **Senior Backend**: Carlos Mendoza (Python, FastAPI, AWS ECS, CI/CD, Redis).

---

## 💻 Stack Tecnológico

- **Frontend**: Next.js 16 (React 19, TypeScript, Tailwind CSS, Lucide Icons, Turbopack).
- **Backend**: FastAPI (Python 3.12, Uvicorn, SQLAlchemy, SQLite).
- **Parsers y Motores**: `pdfplumber`, `python-docx`, `reportlab`.
- **Despliegue**: GitHub Pages (Frontend estático con soporte offline) + GitHub Actions.

---

## 🚀 Probar la Suite Ahora

Haz clic en el siguiente enlace para analizar o construir tu CV 100% apto para filtros ATS:

👉 **[https://marodriguezd.github.io/ATS/](https://marodriguezd.github.io/ATS/)**

