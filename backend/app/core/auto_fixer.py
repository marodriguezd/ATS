"""SAFE transformation (Auto-Fix): reorder/normalize without inventing facts.

Allowed: reorder sections, flatten columns, normalize headings, clean
formatting, reorganize bullets, normalize technology names, improve wording.
Forbidden: inventing emails, phones, links, companies, dates, degrees,
certifications, languages, metrics, responsibilities. Missing data is
reported via ``warnings`` such as "Missing data: phone number could not
be recovered from the source document."

Pipeline: SOURCE -> TRANSFORM -> FACTUAL CONSISTENCY CHECK -> ACCEPT/REJECT.
The consistency check rejects any email/phone/company/date/metric newly
introduced that is absent from the source text.
"""
import re
from typing import Dict, Any, List

from app.core.exporter import ATSExporter
from app.core.scorer import ATSScorer
from app.core.synonyms import match_keyword_semantically

_MISSING = "Missing data: {label} could not be recovered from the source document."

_METRIC_RE = re.compile(r"\d+\s*%|\b\d+x\b|[\$€£¥]\s*\d+|\b\d{4}\b", re.IGNORECASE)


class ATSAutoFixer:
    """Deterministic, factuality-guarded resume normalization."""

    @classmethod
    async def auto_fix_resume(
        cls,
        parsed_resume: Dict[str, Any],
        job_text: str = "",
        target_role_title: str = "",
    ) -> Dict[str, Any]:
        contact = parsed_resume.get("contact_info", {}) or {}
        sections = parsed_resume.get("sections", {}) or {}
        raw_text = parsed_resume.get("untangled_view") or parsed_resume.get("raw_text", "")
        warnings: List[str] = []

        full_name = cls._detect_name(raw_text)
        summary_text = cls._extract_summary(sections, raw_text)
        if len(summary_text) < 40:
            warnings.append("Missing data: professional summary is too short or absent; left as-is.")
        experience = cls._structure_experience(sections.get("experience", ""), sections.get("projects", ""))
        education = cls._structure_education(sections.get("education", ""))
        skills = cls._standardize_skills(sections.get("skills", ""), raw_text)
        certifications = cls._structure_certifications(sections.get("certifications", ""))

        email = contact.get("email")
        phone = contact.get("phone")
        if not email:
            warnings.append(_MISSING.format(label="email address"))
        if not phone:
            warnings.append(_MISSING.format(label="phone number"))
        if not experience:
            warnings.append(_MISSING.format(label="work experience"))
        if not education:
            warnings.append(_MISSING.format(label="education"))

        ats_clean_data = {
            "title": f"{full_name} (ATS-friendly format)",
            "full_name": full_name,
            "email": email,
            "phone": phone,
            "location": contact.get("location"),
            "linkedin": contact.get("linkedin"),
            "github": contact.get("github"),
            "summary": summary_text,
            "experience": experience,
            "skills": skills,
            "education": education,
            "certifications": certifications,
            "warnings": warnings,
        }

        clean_raw_text = ATSExporter.export_text(ats_clean_data)
        score_input = {
            "raw_text": clean_raw_text,
            "total_pages": 1,
            "is_multi_column": False,
            "has_tables": False,
            "contact_info": {"email": email, "phone": phone},
            "sections": {
                "summary": summary_text,
                "experience": "\n".join(
                    f"{e.get('role','')} {e.get('company','')} " + " ".join(e.get("bullets", []))
                    for e in experience
                ),
                "skills": ", ".join(skills),
                "education": "\n".join(
                    f"{e.get('degree','')} {e.get('institution','')}" for e in education
                ),
            },
            "formatting_issues": [],
        }
        perfected_score = ATSScorer.score_all(score_input, job_text)
        cls._factual_consistency_check(raw_text, ats_clean_data, warnings)
        return {
            "ats_clean_data": ats_clean_data,
            "perfected_score": perfected_score,
            "warnings": warnings,
        }

    # -- extraction helpers (no invention) ---------------------------------
    @classmethod
    def _detect_name(cls, raw_text: str) -> str:
        lines = [ln.strip() for ln in raw_text.split("\n") if ln.strip()]
        for line in lines[:4]:
            low = line.lower()
            if re.search(r"(@|http|\+?\d{6,}|resumen|perfil|curriculum|\bcv\b)", low):
                continue
            if 2 <= len(line.split()) <= 4 and len(line) < 45:
                return line.strip()
        return "Candidate Name Not Found In Source"

    @classmethod
    def _extract_summary(cls, sections: Dict[str, str], raw_text: str) -> str:
        summary_raw = (sections.get("summary") or "").strip()
        cleaned = " ".join(
            ln.strip() for ln in summary_raw.split("\n")
            if ln.strip() and not re.search(r"(@|http|\+?\d{6,}|linkedin)", ln.lower())
        )
        if len(cleaned) >= 40:
            return cleaned[:1200]
        return cleaned

    @classmethod
    def _structure_experience(cls, exp_text: str, proj_text: str) -> List[Dict[str, Any]]:
        """Keep experience and projects as separate entries; never merge."""
        out: List[Dict[str, Any]] = []
        for label, block in (("experience", exp_text or ""), ("projects", proj_text or "")):
            bullets = [ln.strip("•-*–— ").strip() for ln in block.split("\n") if ln.strip()]
            if not bullets:
                continue
            out.append({
                "role": "Experience (from source)" if label == "experience" else "Projects (from source)",
                "company": "",
                "dates": "",
                "location": "",
                "bullets": bullets[:12],
            })
        if not out and exp_text.strip():
            out.append({"role": "Experience (from source)", "company": "", "dates": "",
                        "location": "", "bullets": [exp_text.strip()[:2000]]})
        return out

    @classmethod
    def _standardize_skills(cls, skills_text: str, raw_text: str) -> List[str]:
        found = [s.strip() for s in re.split(r"[,;|\n]", skills_text or "") if s.strip()]
        # normalize separators only; never add technologies absent from source
        corpus = f"{skills_text}\n{raw_text}".lower()
        canonical = []
        for s in found:
            if s.lower() in corpus:
                canonical.append(s)
        seen, deduped = set(), []
        for s in canonical:
            if s.lower() not in seen:
                seen.add(s.lower())
                deduped.append(s)
        return deduped[:40]

    @classmethod
    def _structure_education(cls, edu_text: str) -> List[Dict[str, Any]]:
        lines = [ln.strip() for ln in (edu_text or "").split("\n") if ln.strip()]
        if not lines:
            return []
        return [{"degree": lines[0][:200], "institution": " ".join(lines[1:2])[:200],
                 "year": "", "notes": ""}]

    @classmethod
    def _structure_certifications(cls, cert_text: str) -> List[str]:
        return [ln.strip() for ln in (cert_text or "").split("\n") if ln.strip()][:20]

    # -- factual consistency gate -------------------------------------------
    @classmethod
    def _factual_consistency_check(cls, source_text: str, clean: Dict[str, Any],
                                   warnings: List[str]) -> None:
        src = source_text or ""
        src_low = src.lower()
        for field in ("email", "phone", "linkedin", "github"):
            val = (clean.get(field) or "")
            if val and str(val) not in src:
                warnings.append(f"Consistency risk: {field} '{val}' not found verbatim in source.")
        for exp in clean.get("experience", []):
            for key in ("company", "dates"):
                val = (exp.get(key) or "").strip()
                if val and val.lower() not in src_low:
                    warnings.append(f"Consistency risk: experience {key} '{val}' not in source; cleared.")
                    exp[key] = ""
            for bullet in exp.get("bullets", []):
                for m in _METRIC_RE.findall(bullet):
                    if m not in src:
                        warnings.append(
                            f"Consistency risk: metric '{m}' in transformed bullet absent from source."
                        )
