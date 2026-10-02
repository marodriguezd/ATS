import re
from typing import Dict, Any, List, Set, Tuple
from app.core.synonyms import match_keyword_semantically, get_canonical, TECH_SYNONYMS

class ATSScorer:
    """
    Multidimensional ATS Scorer:
    1. Parseability (0-100)
    2. Keyword Match (0-100)
    3. Impact & STAR/Metrics (0-100)
    4. Format & Length (0-100)
    """

    ACTION_VERBS = {
        # English
        "led", "spearheaded", "developed", "architected", "engineered", "designed",
        "implemented", "built", "optimized", "increased", "decreased", "reduced",
        "generated", "automated", "delivered", "mentored", "orchestrated", "transformed",
        "achieved", "launched", "scaled", "negotiated", "managed", "created", "streamlined",
        # Spanish
        "lideré", "lideró", "diseñé", "diseñó", "desarrollé", "desarrolló", "construí", "implementé",
        "optimicé", "aumenté", "reduje", "generé", "automaticé", "entregué", "escalé", "lancé",
        "creé", "gestioné", "coordiné", "transformé", "mejoré", "alcancé", "establecí",
        # Retail, Operations & Service
        "atendí", "atendió", "repuse", "repuso", "mantuve", "mantuvo", "organicé", "organizó",
        "asesoré", "asesoró", "cobré", "cobró", "realicé", "realizó", "cuidé", "cuidó", "supervisé",
        "atención", "gestión", "reposición", "mantenimiento", "organización", "asesoramiento", "manejo"
    }

    METRIC_PATTERNS = [
        r"\b\d+([.,]\d+)?\s*%",                      # Percentages: 25%, 3.5%
        r"[\$€£¥]\s*\d+([.,]\d+)?\s*(k|m|b|mil|millones)?\b",  # Currency: $100k, €5M
        r"\b\d+([.,]\d+)?\s*(k|m|b|mil|millones)\b", # Multipliers: 50k, 2M
        r"\b\d+\s*\+\s*(users|usuarios|clients|clientes|projects|proyectos|leads|commits)\b",
        r"\b(2x|3x|4x|5x|10x)\b",                   # Multipliers: 2x faster
        r"\b\d+\s*(segundos|minutos|horas|días|semanas|meses|seconds|minutes|hours|days|weeks|months)\b",
        r"\bde\s+\d+\s+a\s+\d+\b",                  # "de 10 a 50"
        r"\bfrom\s+\d+\s+to\s+\d+\b",
    ]

    COMMON_TECH_KEYWORDS = {
        "python", "javascript", "typescript", "react", "next.js", "nextjs", "vue", "angular",
        "node", "nodejs", "express", "fastapi", "django", "flask", "docker", "kubernetes",
        "aws", "azure", "gcp", "sql", "postgresql", "mysql", "mongodb", "redis",
        "git", "github", "ci/cd", "rest", "graphql", "tailwind", "html", "css",
        "linux", "bash", "agile", "scrum", "microservices", "terraform", "kafka",
        "pytest", "jest", "cypress", "spark", "pandas", "numpy", "machine learning",
        "llm", "ai", "figma", "system design", "devops", "cloud"
    }

    @classmethod
    def score_all(cls, resume_parse: Dict[str, Any], job_text: str = "") -> Dict[str, Any]:
        raw_text = resume_parse.get("raw_text", "")
        formatting_issues = list(resume_parse.get("formatting_issues", []))

        # 1. Parseability Score
        parseability_score, parse_details = cls._calculate_parseability(resume_parse)

        # 2. Impact & Action Verbs / Metrics Score
        impact_score, impact_details = cls._calculate_impact(raw_text)

        # 3. Format & Structure Score
        format_score, format_details = cls._calculate_format(resume_parse)

        # 4. Keyword Match Score (against job description if provided)
        keyword_score, kw_details = cls._calculate_keywords(resume_parse, job_text)

        # Overall weighted score
        if job_text.strip():
            overall = int(
                keyword_score * 0.40 +
                impact_score * 0.25 +
                parseability_score * 0.20 +
                format_score * 0.15
            )
        else:
            # Standalone CV score without job comparison
            overall = int(
                impact_score * 0.40 +
                parseability_score * 0.35 +
                format_score * 0.25
            )

        # Priority Recommendations
        recommendations = cls._generate_priority_recommendations(
            parseability_score, keyword_score, impact_score, format_score,
            kw_details, impact_details, formatting_issues
        )

        return {
            "overall_score": max(0, min(100, overall)),
            "breakdown": {
                "parseability": parseability_score,
                "keyword_match": keyword_score,
                "impact": impact_score,
                "format": format_score,
            },
            "parse_details": parse_details,
            "keyword_details": kw_details,
            "impact_details": impact_details,
            "format_details": format_details,
            "formatting_issues": formatting_issues,
            "priority_recommendations": recommendations,
        }

    @classmethod
    def _calculate_parseability(cls, resume_parse: Dict[str, Any]) -> Tuple[int, Dict[str, Any]]:
        score = 100
        penalties = []
        sections = resume_parse.get("sections", {})
        contact = resume_parse.get("contact_info", {})

        # Standard sections detected
        key_sections = ["experience", "education", "skills"]
        missing_sections = [s for s in key_sections if s not in sections]
        if missing_sections:
            deduction = len(missing_sections) * 15
            score -= deduction
            penalties.append(f"Secciones clave no detectadas como encabezado estándar: {', '.join(missing_sections)} (-{deduction} pts)")

        # Column layout
        if resume_parse.get("is_multi_column"):
            score -= 25
            penalties.append("Diseño a múltiples columnas detectado (-25 pts). Rompe el orden de lectura de Workday/Taleo.")

        # Tables
        if resume_parse.get("has_tables"):
            score -= 15
            penalties.append("Tablas detectadas en el diseño (-15 pts).")

        # Contact info
        if not contact.get("email"):
            score -= 30
            penalties.append("Correo electrónico ausente o en formato ilegible (-30 pts).")
        if not contact.get("phone"):
            score -= 10
            penalties.append("Teléfono ausente o ilegible (-10 pts).")

        final_score = max(10, min(100, score))
        return final_score, {
            "detected_sections": list(sections.keys()),
            "missing_sections": missing_sections,
            "contact_found": contact,
            "penalties": penalties
        }

    @classmethod
    def _calculate_impact(cls, raw_text: str) -> Tuple[int, Dict[str, Any]]:
        lines = [line.strip() for line in raw_text.split("\n") if len(line.strip()) > 15]
        bullet_lines = [l for l in lines if re.match(r"^(\(cid:\d+\)|[-•*–—\d\.]|\&bull\;)\s*", l) or len(l) > 25]

        action_verb_count = 0
        metric_count = 0
        star_like_bullets = []
        weak_bullets = []

        # Find metrics in whole text
        total_metrics = 0
        for pattern in cls.METRIC_PATTERNS:
            matches = re.findall(pattern, raw_text, re.IGNORECASE)
            total_metrics += len(matches)

        for line in bullet_lines:
            # Clean line from bullet prefix or cid artifacts
            cleaned_line = re.sub(r"^(\(cid:\d+\)|[-•*–—\d\.]|\&bull\;)\s*", "", line)
            words = [w for w in re.findall(r"\b[a-zA-ZáéíóúÁÉÍÓÚñÑ]+\b", cleaned_line.lower()) if w not in {"cid"}]
            first_words = words[:4] if words else []
            has_action = any(v in cls.ACTION_VERBS for v in first_words)
            has_metric = any(re.search(pat, cleaned_line, re.IGNORECASE) for pat in cls.METRIC_PATTERNS)

            if has_action:
                action_verb_count += 1

            if has_action and has_metric:
                star_like_bullets.append(line)
            elif not has_action and not has_metric:
                if len(weak_bullets) < 5:
                    weak_bullets.append(line)

        # Scoring logic
        # 1. Action verbs ratio
        total_sample = max(1, len(bullet_lines))
        action_ratio = min(1.0, action_verb_count / min(10, total_sample))
        # 2. Metric count: 5+ metrics is great
        metric_ratio = min(1.0, total_metrics / 5.0)

        score = int((action_ratio * 50) + (metric_ratio * 50))
        final_score = max(15, min(100, score))

        return final_score, {
            "total_metrics_found": total_metrics,
            "action_verbs_count": action_verb_count,
            "star_bullets_count": len(star_like_bullets),
            "weak_bullets_examples": weak_bullets[:3],
            "action_verb_coverage": f"{int(action_ratio * 100)}%",
            "metrics_coverage": f"{int(metric_ratio * 100)}%"
        }

    @classmethod
    def _calculate_format(cls, resume_parse: Dict[str, Any]) -> Tuple[int, Dict[str, Any]]:
        score = 100
        raw_text = resume_parse.get("raw_text", "")
        word_count = len(raw_text.split())
        pages = resume_parse.get("total_pages", 1)

        # Word count guideline: 350 to 900 words is ideal
        if word_count < 250:
            score -= 20
        elif word_count > 1200:
            score -= 15

        if pages > 2:
            score -= (pages - 2) * 15

        final_score = max(20, min(100, score))
        return final_score, {
            "word_count": word_count,
            "pages": pages,
            "ideal_word_count_range": "350 - 900 palabras"
        }

    UNIVERSAL_STOPWORDS = {
        # Spanish stopwords & generic filler
        "de", "la", "el", "en", "y", "a", "los", "del", "se", "las", "por", "un", "para", "con", "no", "una",
        "su", "al", "lo", "como", "mas", "pero", "sus", "le", "ya", "o", "este", "si", "porque", "esta",
        "entre", "cuando", "muy", "sin", "sobre", "tambien", "me", "hasta", "hay", "donde", "quien",
        "desde", "todo", "nos", "durante", "todos", "uno", "les", "ni", "contra", "otros", "ese", "eso",
        "ante", "ellos", "e", "esto", "mi", "antes", "algunos", "que", "unos", "yo", "otro", "otras",
        "otra", "tanto", "esa", "estos", "mucho", "quienes", "nada", "muchos", "cual", "poco",
        "ella", "estar", "estas", "algunas", "algo", "nosotros", "mis", "tus", "nuestro", "nuestra",
        "nuestros", "nuestras", "somos", "estamos", "tienen", "tenemos", "puedes", "podras", "daras",
        "cuidaras", "realizaras", "aseguraras", "uniras", "brindamos", "buscamos", "ofrecemos", "esperamos",
        "busqueda", "puesto", "empresa", "posiciones", "procedimientos", "proceso", "propios", "propias",
        "ano", "anos", "mes", "meses", "dia", "dias", "horas", "procedimiento", "establecidos",
        "casi", "territorio", "nacional", "internacional", "plena", "pleno", "expansion",
        "maxima", "linea", "siente", "enamorate", "unico", "unica", "cambio", "forma", "compromiso",
        "motivacion", "equipo", "parte", "dinamico", "inclusivo", "dentro", "nivel", "disfrutar", "club",
        "servicio", "totalmente", "gratuito", "caso", "positivamente", "tener", "relacionada", "asi",
        "buenas", "habilidades", "interes", "trabajar", "dudes", "inscribete", "esperando", "posicion",
        # English
        "the", "and", "to", "of", "a", "in", "is", "that", "for", "it", "as", "was", "with", "on", "at",
        "by", "this", "be", "are", "from", "or", "have", "an", "they", "which", "one", "you", "were", "her",
        "all", "she", "there", "would", "their", "we", "him", "been", "has", "when", "who", "will", "more"
    }

    UNIVERSAL_KEY_PHRASES = [
        # Retail, Operations & Soft Skills
        "atencion al cliente", "trabajo en equipo", "sala de ventas", "jornada parcial",
        "orientacion al cliente", "reposicion de mercancia", "gestion de stock", "control de inventario",
        "cierre de caja", "arqueo de caja", "orden y limpieza",
        # Tech & Engineering
        "spring boot", "machine learning", "deep learning", "inteligencia artificial",
        "bases de datos", "desarrollo web", "apis rest", "pruebas unitarias", "control de versiones",
        "integracion continua", "arquitectura limpia", "desarrollo de aplicaciones multiplataforma",
        "desarrollo de aplicaciones web"
    ]

    UNIVERSAL_PRIORITY_TERMS = {
        # Retail & Logistics
        "retail", "cajero", "cajeros", "cajera", "cajeras", "reponedor", "reponedores",
        "caja", "almacen", "tienda", "tiendas", "mercancia", "comercio", "ingles", "idiomas",
        "dinamismo", "limpieza", "ventas", "alimentacion",
        # Tech
        "python", "java", "react", "docker", "sql", "linux", "aws", "git", "fastapi", "kotlin",
        "dam", "daw", "asir", "microservicios", "postgresql", "mysql", "kubernetes", "typescript"
    }

    @classmethod
    def _extract_job_keywords(cls, job_text: str, max_keywords: int = 14) -> List[str]:
        from app.core.synonyms import strip_accents
        norm_job = strip_accents(job_text.lower())

        found_phrases = []
        for phrase in cls.UNIVERSAL_KEY_PHRASES:
            phrase_norm = strip_accents(phrase)
            if re.search(rf"\b{re.escape(phrase_norm)}\b", norm_job):
                found_phrases.append(phrase)

        # Word frequency analysis with boundary check
        words = re.findall(r"\b[a-z]{3,20}\b", norm_job)
        word_freq = {}
        for w in words:
            if w not in cls.UNIVERSAL_STOPWORDS and len(w) > 3:
                # Skip if already part of an extracted phrase
                if any(w in p for p in found_phrases):
                    continue
                word_freq[w] = word_freq.get(w, 0) + 1

        for w in list(word_freq.keys()):
            if w in cls.UNIVERSAL_PRIORITY_TERMS:
                word_freq[w] *= 3

        # Add tech keywords explicitly if matched with word boundary
        for kw in cls.COMMON_TECH_KEYWORDS:
            if re.search(rf"\b{re.escape(kw)}\b", norm_job):
                word_freq[kw] = word_freq.get(kw, 0) + 5

        # Acronyms (e.g. AWS, DAM, DAW, SQL) strictly with word boundaries
        acronyms = re.findall(r"\b[A-Z]{2,6}\b", job_text)
        for acr in acronyms:
            acr_low = acr.lower()
            if acr_low not in cls.UNIVERSAL_STOPWORDS:
                word_freq[acr_low] = word_freq.get(acr_low, 0) + 4

        sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        top_singles = [w for w, count in sorted_words[:(max_keywords - len(found_phrases))]]

        return found_phrases + top_singles

    @classmethod
    def _calculate_keywords(cls, resume_input: Any, job_text: str) -> Tuple[int, Dict[str, Any]]:
        if not job_text.strip():
            return 80, {
                "matched_keywords": [],
                "missing_keywords": [],
                "in_experience": [],
                "in_skills_only": [],
                "coverage_pct": 100,
                "note": "No se proporcionó oferta de empleo. Puntuación neutra basada en estándares técnicos."
            }

        if isinstance(resume_input, dict):
            raw_text = resume_input.get("raw_text", "")
            sections = resume_input.get("sections", {})
        else:
            raw_text = str(resume_input)
            sections = {}

        exp_text = (sections.get("experience", "") + " " + sections.get("projects", "")).lower()
        skills_text = (sections.get("skills", "") + " " + sections.get("education", "")).lower()

        # Dynamic extraction from job text
        extracted_keywords = cls._extract_job_keywords(job_text)

        matched = []
        missing = []
        in_experience = []
        in_skills_only = []
        score_accumulator = 0.0

        for kw in extracted_keywords:
            in_exp = match_keyword_semantically(kw, exp_text)
            in_sk = match_keyword_semantically(kw, skills_text)
            in_raw = match_keyword_semantically(kw, raw_text)

            if in_exp:
                matched.append(kw)
                in_experience.append(kw)
                score_accumulator += 1.0
            elif in_sk or in_raw:
                matched.append(kw)
                in_skills_only.append(kw)
                score_accumulator += 0.80
            else:
                missing.append(kw)

        total_kw = max(1, len(extracted_keywords))
        coverage_pct = int(min(100, (len(matched) / total_kw) * 100))
        score = int(min(100, (score_accumulator / total_kw) * 100))

        return score, {
            "total_extracted_keywords": len(extracted_keywords),
            "matched_keywords": matched,
            "missing_keywords": missing,
            "in_experience": in_experience,
            "in_skills_only": in_skills_only,
            "coverage_pct": coverage_pct
        }

    @classmethod
    def _generate_priority_recommendations(
        cls,
        parseability: int,
        keyword_score: int,
        impact_score: int,
        format_score: int,
        kw_details: Dict[str, Any],
        impact_details: Dict[str, Any],
        formatting_issues: List[Dict[str, Any]]
    ) -> List[Dict[str, str]]:
        recs = []

        # 1. Format/Parseability criticals
        for issue in formatting_issues:
            if issue.get("severity") == "high":
                recs.append({
                    "category": "Estructura & ATS",
                    "priority": "Alta",
                    "action": issue.get("message")
                })

        # 1. Sector/Role Mismatch Warning
        total_kw = kw_details.get("total_extracted_keywords", 0)
        coverage = kw_details.get("coverage_pct", 100)
        if total_kw >= 4 and coverage < 35:
            recs.append({
                "category": "Alineación de Perfil",
                "priority": "Crítica",
                "action": "Desajuste sectorial detectado: El perfil del CV no coincide con los requisitos operativos de esta vacante. Destaca competencias transferibles (trabajo en equipo, organización, dinamismo, atención al cliente) para optar a este puesto."
            })

        # 2. Missing keywords
        missing_kw = kw_details.get("missing_keywords", [])
        if missing_kw:
            recs.append({
                "category": "Palabras Clave",
                "priority": "Alta",
                "action": f"Incorpora estas keywords esenciales de la oferta: {', '.join(missing_kw[:6])}."
            })

        # 3. Impact & metrics
        metrics_found = impact_details.get("total_metrics_found", 0)
        if metrics_found < 3:
            recs.append({
                "category": "Impacto STAR",
                "priority": "Media",
                "action": "Añade métricas cuantificables (%, €, volumen de usuarios, tiempos reducidos) en tus viñetas de experiencia."
            })

        # 4. Action verbs
        weak_examples = impact_details.get("weak_bullets_examples", [])
        if weak_examples:
            recs.append({
                "category": "Verbos de Acción",
                "priority": "Media",
                "action": "Empieza cada viñeta con un verbo de acción potente (ej. 'Lideré', 'Automaticé', 'Optimizé') en lugar de descripciones pasivas de tareas."
            })

        return recs[:5]
