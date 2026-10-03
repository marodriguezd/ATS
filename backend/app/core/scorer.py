"""Heuristic ATS-readability audit scorer.

Scores are internal heuristic signals (0-100), NOT probabilities of
acceptance by Workday/Taleo/Greenhouse/Lever/iCIMS/SuccessFactors.
Each category returns raw observations, contributing factors,
explanation and limitations so results stay explainable.
"""
import re
from typing import Dict, Any, List, Tuple
from app.core.synonyms import (
    match_keyword_semantically, classify_keyword_match, get_canonical,
    TECH_SYNONYMS, strip_accents,
)
from app.core.domain import CATEGORY_WEIGHTS_WITH_JOB, CATEGORY_WEIGHTS_NO_JOB

class ATSScorer:
    """Categories: Parseability, Keyword Alignment, Evidence Strength,
    Formatting Risk (+ Job-Relevance Alignment when a job description exists)."""

    ACTION_VERBS = {
        "led", "spearheaded", "developed", "architected", "engineered", "designed",
        "implemented", "built", "optimized", "increased", "decreased", "reduced",
        "generated", "automated", "delivered", "mentored", "orchestrated", "transformed",
        "achieved", "launched", "scaled", "negotiated", "managed", "created", "streamlined",
        "lideré", "lideró", "diseñé", "diseñó", "desarrollé", "desarrolló", "construí",
        "implementé", "optimicé", "aumenté", "reduje", "generé", "automaticé", "entregué",
        "escalé", "lancé", "creé", "gestioné", "coordiné", "transformé", "mejoré",
        "alcancé", "establecí", "atendí", "repuse", "organicé", "asesoré", "supervisé",
        "realicé", "mantuve",
    }

    # A number counts as *evidence* only when attached to an outcome-ish unit.
    METRIC_PATTERNS = [
        r"\b\d+([.,]\d+)?\s*%",
        r"[\$€£¥]\s*\d+([.,]\d+)?\s*(k|m|b|mil|millones)?\b",
        r"\b\d+([.,]\d+)?\s*(k|m|b|mil|millones)\b",
        r"\b\d+\s*\+\s*(users|usuarios|clients|clientes|projects|proyectos|devices|dispositivos)\b",
        r"\b(2x|3x|4x|5x|10x)\b",
        r"\b\d+\s*(seconds|minutes|hours|days|weeks|months|segundos|minutos|horas|d[ií]as|semanas|meses)\b",
    ]
    # Weak numeric mentions that are NOT evidence on their own (years, counts w/o outcome).
    OUTCOME_HINTS = re.compile(
        r"(reduc|increm|improv|mejor|optim|ahorr|crec|growth|uptime|latenc|conversion|revenue|ventas|eficiencia|precision)",
        re.IGNORECASE,
    )

    COMMON_TECH_KEYWORDS = {
        "python", "javascript", "typescript", "react", "nextjs", "vue", "angular",
        "node", "nodejs", "express", "fastapi", "django", "flask", "docker", "kubernetes",
        "aws", "azure", "gcp", "sql", "postgresql", "mysql", "mongodb", "redis",
        "git", "github", "ci/cd", "rest", "graphql", "tailwind", "html", "css",
        "linux", "bash", "agile", "scrum", "microservices", "terraform", "kafka",
        "pytest", "jest", "cypress", "spark", "pandas", "numpy", "machine learning",
        "llm", "ai", "figma", "system design", "devops", "cloud",
    }

    UNIVERSAL_STOPWORDS = {
        "de", "la", "el", "en", "y", "a", "los", "del", "se", "las", "por", "un",
        "para", "con", "no", "una", "su", "al", "lo", "como", "pero", "sus", "le",
        "ya", "o", "este", "si", "porque", "esta", "entre", "cuando", "muy", "sin",
        "sobre", "tambien", "me", "hasta", "hay", "donde", "quien", "desde", "todo",
        "nos", "durante", "todos", "uno", "les", "ni", "contra", "otros", "ese",
        "eso", "ante", "ellos", "esto", "mi", "antes", "algunos", "que", "unos",
        "yo", "otro", "otras", "otra", "tanto", "esa", "estos", "mucho", "quienes",
        "nada", "muchos", "cual", "poco", "ella", "estar", "estas", "algo",
        "the", "and", "to", "of", "a", "in", "is", "that", "for", "it", "as",
        "was", "with", "on", "at", "by", "this", "be", "are", "from", "or",
        "have", "an", "they", "which", "one", "you", "were", "all", "there",
        "would", "their", "we", "him", "been", "has", "when", "who", "will", "more",
        # generic company boilerplate down-weighted, not removed entirely
        "puesto", "empresa", "equipo", "jornada", "compromiso", "motivacion",
    }

    UNIVERSAL_KEY_PHRASES = [
        "atencion al cliente", "trabajo en equipo", "sala de ventas",
        "gestion de stock", "control de inventario", "cierre de caja",
        "spring boot", "machine learning", "deep learning",
        "inteligencia artificial", "bases de datos", "desarrollo web",
        "apis rest", "pruebas unitarias", "control de versiones",
        "integracion continua", "arquitectura limpia",
        "desarrollo de aplicaciones multiplataforma",
        "desarrollo de aplicaciones web",
    ]

    UNIVERSAL_PRIORITY_TERMS = {
        "python", "java", "react", "docker", "sql", "linux", "aws", "git",
        "fastapi", "kotlin", "dam", "daw", "microservicios", "postgresql",
        "mysql", "kubernetes", "typescript",
    }

    # ---- public API -----------------------------------------------------
    @classmethod
    def score_all(cls, resume_parse: Dict[str, Any], job_text: str = "") -> Dict[str, Any]:
        raw_text = resume_parse.get("raw_text", "")
        formatting_issues = list(resume_parse.get("formatting_issues", []))
        parseability_score, parse_details = cls._calculate_parseability(resume_parse)
        impact_score, impact_details = cls._calculate_impact(raw_text)
        format_score, format_details = cls._calculate_format(resume_parse)
        keyword_score, kw_details = cls._calculate_keywords(resume_parse, job_text)

        has_job = bool((job_text or "").strip())
        weights = CATEGORY_WEIGHTS_WITH_JOB if has_job else CATEGORY_WEIGHTS_NO_JOB
        if has_job:
            overall = int(
                keyword_score * weights["keyword_match"]
                + impact_score * weights["evidence"]
                + parseability_score * weights["parseability"]
                + format_score * weights["format"]
            )
        else:
            overall = int(
                impact_score * weights["evidence"]
                + parseability_score * weights["parseability"]
                + format_score * weights["format"]
            )
        recommendations = cls._generate_priority_recommendations(
            parseability_score, keyword_score, impact_score, format_score,
            kw_details, impact_details, formatting_issues,
        )
        return {
            "overall_score": max(0, min(100, overall)),
            "breakdown": {
                "parseability": parseability_score,
                "keyword_match": keyword_score,
                "impact": impact_score,
                "format": format_score,
            },
            "weights": weights,
            "methodology_note": (
                "Heuristic audit score (0-100 per category). Not a prediction of "
                "acceptance by any proprietary ATS product. See per-category "
                "explanation and limitations."
            ),
            "parse_details": parse_details,
            "keyword_details": kw_details,
            "impact_details": impact_details,
            "format_details": format_details,
            "formatting_issues": formatting_issues,
            "priority_recommendations": recommendations,
        }

    # ---- categories -----------------------------------------------------
    @classmethod
    def _calculate_parseability(cls, resume_parse: Dict[str, Any]) -> Tuple[int, Dict[str, Any]]:
        score = 100
        penalties = []
        limitations = [
            "Heuristic checks only; real ATS parsers vary by vendor and configuration."
        ]
        sections = resume_parse.get("sections", {})
        contact = resume_parse.get("contact_info", {})
        key_sections = ["experience", "education", "skills"]
        missing_sections = [s for s in key_sections if s not in sections]
        if missing_sections:
            deduction = len(missing_sections) * 15
            score -= deduction
            penalties.append(
                f"Key sections not detected as standard headers: {', '.join(missing_sections)} (-{deduction})"
            )
        if resume_parse.get("is_multi_column"):
            score -= 25
            penalties.append(
                "Multi-column layout detected (-25). May disrupt reading order in some parsers; not all ATS fail on it."
            )
        if resume_parse.get("has_tables"):
            score -= 15
            penalties.append("Tables detected (-15). May lose cell association in some parsers.")
        if not contact.get("email"):
            score -= 30
            penalties.append("Email missing or not machine-readable (-30).")
        if not contact.get("phone"):
            score -= 10
            penalties.append("Phone missing or not machine-readable (-10).")
        return max(0, min(100, score)), {
            "detected_sections": list(sections.keys()),
            "missing_sections": missing_sections,
            "contact_found": contact,
            "penalties": penalties,
            "explanation": "Penalizes structural risks (missing standard headers, columns, tables, missing contact).",
            "limitations": limitations,
            "raw_observations": {
                "is_multi_column": bool(resume_parse.get("is_multi_column")),
                "has_tables": bool(resume_parse.get("has_tables")),
            },
        }

    @classmethod
    def _calculate_impact(cls, raw_text: str) -> Tuple[int, Dict[str, Any]]:
        lines = [ln.strip() for ln in raw_text.split("\n") if len(ln.strip()) > 15]
        bullet_lines = [
            ln for ln in lines
            if re.match(r"^([-•*–—\d.]|\&bull\;)\s*", ln) or len(ln) > 25
        ]
        action_verb_count = 0
        metric_count = 0
        evidence_bullets: List[str] = []
        weak_bullets: List[str] = []
        for line in bullet_lines:
            cleaned = re.sub(r"^([-•*–—\d.]|\&bull\;)\s*", "", line)
            words = re.findall(r"[a-zA-ZáéíóúÁÉÍÓÚñÑ]+", cleaned.lower())[:4]
            has_action = any(v in cls.ACTION_VERBS for v in words)
            has_metric = any(re.search(p, cleaned, re.IGNORECASE) for p in cls.METRIC_PATTERNS)
            # A number is evidence only with an outcome hint or currency/percent unit.
            has_outcome = bool(cls.OUTCOME_HINTS.search(cleaned)) or bool(
                re.search(r"(%|[\$€£¥]|2x|3x|5x|10x)", cleaned)
            )
            if has_action:
                action_verb_count += 1
            if has_metric and (has_outcome or has_action):
                metric_count += 1
            if has_action and has_metric and has_outcome:
                evidence_bullets.append(line)
            elif not has_action and not has_metric and len(weak_bullets) < 5:
                weak_bullets.append(line)
        total_sample = max(1, len(bullet_lines))
        action_ratio = min(1.0, action_verb_count / min(10, total_sample))
        metric_ratio = min(1.0, metric_count / 5.0)
        score = int(action_ratio * 50 + metric_ratio * 50)
        return max(0, min(100, score)), {
            "total_metrics_found": metric_count,
            "action_verbs_count": action_verb_count,
            "star_bullets_count": len(evidence_bullets),
            "weak_bullets_examples": weak_bullets[:3],
            "action_verb_coverage": f"{int(action_ratio * 100)}%",
            "metrics_coverage": f"{int(metric_ratio * 100)}%",
            "explanation": "Counts bullets starting with action verbs and numbers tied to an outcome cue; bare numbers alone do not count as achievements.",
            "limitations": ["Lexical heuristic; cannot judge truthfulness or seniority of claims."],
        }

    @classmethod
    def _calculate_format(cls, resume_parse: Dict[str, Any]) -> Tuple[int, Dict[str, Any]]:
        score = 100
        raw_text = resume_parse.get("raw_text", "")
        word_count = len(raw_text.split())
        pages = resume_parse.get("total_pages", 1) or 1
        factors = [f"word_count={word_count}", f"pages={pages}"]
        if word_count < 250:
            score -= 20
            factors.append("short (<250 words): -20")
        elif word_count > 1200:
            score -= 15
            factors.append("dense (>1200 words): -15")
        if pages > 2:
            score -= (pages - 2) * 15
            factors.append(f"pages>2: -{(pages - 2) * 15}")
        return max(0, min(100, score)), {
            "word_count": word_count,
            "pages": pages,
            "ideal_word_count_range": "350 - 900 palabras",
            "explanation": "Rewards concise 1-2 page resumes with reasonable density.",
            "limitations": ["Length alone says nothing about quality or relevance."],
            "contributing_factors": factors,
        }

    # ---- job description analysis --------------------------------------
    @classmethod
    def _split_job_zones(cls, job_text: str) -> Dict[str, str]:
        """Split JD into required / preferred / contextual zones heuristically."""
        text = job_text or ""
        lower = strip_accents(text.lower())
        zones = {"required": text, "preferred": "", "context": ""}
        pref_match = re.search(
            r"(nice to have|preferred|plus|valorable|valoraremos|se valorara|deseable|bonus)[\s:]*",
            lower,
        )
        if pref_match:
            zones["required"] = text[: pref_match.start()]
            zones["preferred"] = text[pref_match.start():]
        # first 1-2 sentences often boilerplate; keep as context if company-heavy
        return zones

    @classmethod
    def _extract_job_keywords(cls, job_text: str, max_keywords: int = 14) -> List[Dict[str, str]]:
        """Return prioritized keyword signals with REQUIRED/PREFERRED/CONTEXTUAL tags."""
        zones = cls._split_job_zones(job_text)
        req_norm = strip_accents(zones["required"].lower())
        pref_norm = strip_accents(zones["preferred"].lower())
        full_norm = strip_accents(job_text.lower())

        found: List[Dict[str, str]] = []
        seen: set[str] = set()

        def tag_for(phrase_norm: str) -> str:
            if pref_norm and re.search(rf"\b{re.escape(phrase_norm)}\b", pref_norm):
                return "PREFERRED"
            if re.search(rf"\b{re.escape(phrase_norm)}\b", req_norm):
                return "REQUIRED"
            return "CONTEXTUAL"

        for phrase in cls.UNIVERSAL_KEY_PHRASES:
            pn = strip_accents(phrase)
            if re.search(rf"\b{re.escape(pn)}\b", full_norm) and phrase not in seen:
                seen.add(phrase)
                found.append({"keyword": phrase, "tag": tag_for(pn), "source": "phrase"})

        words = re.findall(r"\b[a-z]{3,20}\b", full_norm)
        freq: Dict[str, int] = {}
        for w in words:
            if w in cls.UNIVERSAL_STOPWORDS or len(w) <= 3:
                continue
            if any(w in p for p in found):
                continue
            freq[w] = freq.get(w, 0) + 1
        for w in list(freq):
            if w in cls.UNIVERSAL_PRIORITY_TERMS:
                freq[w] *= 3
        for kw in cls.COMMON_TECH_KEYWORDS:
            if re.search(rf"\b{re.escape(kw)}\b", full_norm):
                freq[kw] = freq.get(kw, 0) + 5
        for acr in re.findall(r"\b[A-Z]{2,6}\b", job_text):
            low = acr.lower()
            if low not in cls.UNIVERSAL_STOPWORDS:
                freq[low] = freq.get(low, 0) + 4
        ranked = sorted(freq.items(), key=lambda x: x[1], reverse=True)
        for w, _ in ranked[: max(0, max_keywords - len(found))]:
            if w not in seen:
                seen.add(w)
                found.append({"keyword": w, "tag": tag_for(w), "source": "frequency"})
        return found[:max_keywords]

    @classmethod
    def _calculate_keywords(cls, resume_input: Any, job_text: str) -> Tuple[int, Dict[str, Any]]:
        if not (job_text or "").strip():
            return 0, {
                "matched_keywords": [], "missing_keywords": [],
                "in_experience": [], "in_skills_only": [],
                "coverage_pct": 0,
                "note": "No job description provided: keyword alignment not scored (neutral 0, excluded from overall via weights).",
                "keywords": [],
            }
        if isinstance(resume_input, dict):
            raw_text = resume_input.get("raw_text", "")
            sections = resume_input.get("sections", {})
        else:
            raw_text = str(resume_input)
            sections = {}
        exp_text = (sections.get("experience", "") + " " + sections.get("projects", "")).lower()
        skills_text = (sections.get("skills", "") + " " + sections.get("education", "")).lower()
        extracted = cls._extract_job_keywords(job_text)
        matched, missing, in_exp, in_skills = [], [], [], []
        matches_detail: List[Dict[str, Any]] = []
        acc = 0.0
        for item in extracted:
            kw = item["keyword"]
            cls_exp, _ = classify_keyword_match(kw, exp_text)
            cls_sk, _ = classify_keyword_match(kw, skills_text)
            cls_raw, canonical = classify_keyword_match(kw, raw_text)
            weight = 1.0 if item["tag"] == "REQUIRED" else (0.7 if item["tag"] == "PREFERRED" else 0.5)
            if cls_exp in ("EXACT", "ALIAS", "NORMALIZED"):
                matched.append(kw); in_exp.append(kw); acc += 1.0 * weight
                matches_detail.append({"keyword": kw, "canonical": canonical, "match_class": cls_exp, "section": "experience", "tag": item["tag"]})
            elif cls_sk in ("EXACT", "ALIAS", "NORMALIZED") or cls_raw in ("EXACT", "ALIAS", "NORMALIZED"):
                matched.append(kw); in_skills.append(kw); acc += 0.8 * weight
                matches_detail.append({"keyword": kw, "canonical": canonical, "match_class": cls_sk if cls_sk != "ABSENT" else cls_raw, "section": "skills_only", "tag": item["tag"]})
            elif cls_exp == "RELATED" or cls_raw == "RELATED":
                matched.append(kw); in_skills.append(kw); acc += 0.4 * weight
                matches_detail.append({"keyword": kw, "canonical": canonical, "match_class": "RELATED", "section": "raw_only", "tag": item["tag"]})
            else:
                missing.append(kw)
                matches_detail.append({"keyword": kw, "canonical": canonical, "match_class": "ABSENT", "section": "absent", "tag": item["tag"]})
        total = max(1, len(extracted))
        max_acc = sum(1.0 if i["tag"] == "REQUIRED" else (0.7 if i["tag"] == "PREFERRED" else 0.5) for i in extracted) or 1.0
        score = int(min(100, acc / max_acc * 100))
        coverage = int(min(100, len(matched) / total * 100))
        return score, {
            "total_extracted_keywords": len(extracted),
            "matched_keywords": matched, "missing_keywords": missing,
            "in_experience": in_exp, "in_skills_only": in_skills,
            "coverage_pct": coverage,
            "keywords": matches_detail,
            "explanation": "REQUIRED terms weigh 1.0, PREFERRED 0.7, CONTEXTUAL 0.5; experience evidence outranks skills-only mentions.",
            "limitations": ["Lexical alias matching, not true semantic understanding."],
        }

    # ---- recommendations ------------------------------------------------
    @classmethod
    def _generate_priority_recommendations(cls, parseability, keyword_score, impact_score,
                                          format_score, kw_details, impact_details,
                                          formatting_issues) -> List[Dict[str, str]]:
        recs = []
        for issue in formatting_issues:
            if issue.get("severity") == "high":
                recs.append({"category": "Estructura y parseabilidad", "priority": "Alta",
                             "action": issue.get("message", "")})
        total_kw = kw_details.get("total_extracted_keywords", 0)
        coverage = kw_details.get("coverage_pct", 0)
        if total_kw >= 4 and coverage < 35:
            missing = ", ".join(kw_details.get("missing_keywords", [])[:6])
            recs.append({"category": "Alineación con la oferta", "priority": "Crítica",
                         "action": f"Baja cobertura de requisitos ({coverage}%). Revisa si la oferta encaja con tu perfil; si aplica, incorpora evidencia real de: {missing}. No inventes experiencia."})
        elif kw_details.get("missing_keywords"):
            recs.append({"category": "Palabras clave", "priority": "Alta",
                         "action": f"Incorpora estas keywords de la oferta solo donde tengas experiencia real: {', '.join(kw_details['missing_keywords'][:6])}."})
        if impact_details.get("total_metrics_found", 0) < 3:
            recs.append({"category": "Evidencia de impacto", "priority": "Media",
                         "action": "Añade resultados medibles donde existan en tu experiencia (%, volúmenes, tiempos). No inventes métricas."})
        if impact_details.get("weak_bullets_examples"):
            recs.append({"category": "Verbos de acción", "priority": "Media",
                         "action": "Inicia cada viñeta con un verbo de acción concreto en lugar de descripciones pasivas."})
        return recs[:5]
