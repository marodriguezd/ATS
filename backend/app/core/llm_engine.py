"""LLM-assisted rewriting with strict factuality guardrails.

Rules enforced here and in prompts:
  - Never invent metrics, employers, dates, degrees, technologies or
    responsibilities. Missing evidence stays missing or uses an explicit
    ``[missing: ...]`` placeholder.
  - Deterministic heuristic fallback only improves grammar/verbs and
    NEVER injects percentages or fabricated outcomes.
  - ``provider`` actually selects the backend (gemini | heuristic).
    Only providers implemented here are advertised.
  - LLM JSON is schema-validated; malformed output is rejected and the
    safe fallback is used. API keys are never logged.
"""
import json
import logging
import os
import re
from typing import Dict, Any, List, Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

SUPPORTED_PROVIDERS = ("gemini", "heuristic")

FACTUALITY_RULES = (
    "STRICT FACTUALITY RULES: do not invent metrics, percentages, results, "
    "technologies, responsibilities, employers, dates, degrees or contact details. "
    "Preserve every factual claim from the original. If evidence is missing, leave it "
    "missing or write an explicit placeholder like [missing metric]."
)


class LLMEngine:
    """LLM rewriting (Gemini) with a deterministic truthful fallback."""

    @classmethod
    def get_api_key(cls, provider: str = "gemini") -> Optional[str]:
        if provider == "gemini":
            return os.getenv("GEMINI_API_KEY") or settings.GEMINI_API_KEY
        return None

    # -- public ----------------------------------------------------------
    @classmethod
    async def rewrite_bullet(
        cls,
        bullet: str,
        role_context: str = "",
        target_keywords: Optional[List[str]] = None,
        provider: str = "gemini",
    ) -> Dict[str, Any]:
        if provider not in SUPPORTED_PROVIDERS:
            raise ValueError(f"Unsupported provider '{provider}'. Supported: {SUPPORTED_PROVIDERS}")
        keywords_str = ", ".join(target_keywords or [])
        prompt = (
            "You are an expert resume editor. Rewrite one work bullet for clarity using a "
            "strong action verb.\n" + FACTUALITY_RULES + "\n"
            f"Role context: {role_context or 'Professional'}\n"
            f"Keywords to include naturally ONLY if already implied: {keywords_str}\n"
            f'Original bullet: "{bullet}"\n'
            'Return ONLY valid JSON: {"original": str, "improved_star": str, '
            '"formula_breakdown": {"action_verb": str, "accomplishment_x": str, '
            '"measurement_y": str, "method_z": str}, "why_ats_loves_it": str}'
        )
        if provider == "gemini":
            key = cls.get_api_key("gemini")
            if key:
                try:
                    result = await cls._call_gemini(prompt, key)
                    validated = cls._validate_bullet_result(result, bullet)
                    if validated is not None:
                        return validated
                except Exception as e:  # provider failure -> explicit fallback
                    logger.warning("[LLM] Gemini call failed: %s", type(e).__name__)
        return cls._fallback_star_rewrite(bullet, target_keywords)

    @classmethod
    async def generate_tailored_summary(
        cls,
        current_summary: str,
        job_description: str,
        key_skills: Optional[List[str]] = None,
        provider: str = "gemini",
    ) -> Dict[str, Any]:
        if provider not in SUPPORTED_PROVIDERS:
            raise ValueError(f"Unsupported provider '{provider}'. Supported: {SUPPORTED_PROVIDERS}")
        prompt = (
            "You are a senior recruiting advisor. Draft a 3-4 line professional summary.\n"
            + FACTUALITY_RULES + "\n"
            f"Current summary: {current_summary}\nJob description: {job_description[:4000]}\n"
            f"Key skills: {', '.join(key_skills or [])}\n"
            'Return ONLY valid JSON: {"tailored_summary": str, '
            '"keywords_included": [str], "tips": [str]}'
        )
        if provider == "gemini":
            key = cls.get_api_key("gemini")
            if key:
                try:
                    result = await cls._call_gemini(prompt, key)
                    validated = cls._validate_summary_result(result)
                    if validated is not None:
                        return validated
                except Exception as e:
                    logger.warning("[LLM] Gemini call failed: %s", type(e).__name__)
        return {
            "tailored_summary": (current_summary or "").strip() or "Professional summary not provided in source.",
            "keywords_included": (key_skills or [])[:3],
            "tips": ["Add a Gemini API key in Settings for offer-tailored drafting."],
            "fallback": True,
        }

    # -- provider ---------------------------------------------------------
    @classmethod
    async def _call_gemini(cls, prompt: str, api_key: str) -> Optional[Dict[str, Any]]:
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            "gemini-2.5-flash:generateContent"
        )
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"},
        }
        # key via header to avoid leaking in URL logs
        headers = {"x-goog-api-key": api_key}
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code != 200:
                logger.warning("[LLM] Gemini status %s", resp.status_code)
                return None
            data = resp.json()
            try:
                content = data["candidates"][0]["content"]["parts"][0]["text"]
            except (KeyError, IndexError, TypeError):
                return None
            try:
                parsed = json.loads(content)
            except json.JSONDecodeError:
                # try to salvage first JSON object
                m = re.search(r"\{.*\}", content, re.DOTALL)
                if not m:
                    return None
                try:
                    parsed = json.loads(m.group(0))
                except json.JSONDecodeError:
                    return None
            return parsed if isinstance(parsed, dict) else None

    # -- validation --------------------------------------------------------
    _METRIC_RE = re.compile(r"\d+\s*%|\b\d+x\b|[\$€£¥]\s*\d+", re.IGNORECASE)

    @classmethod
    def _hallucinated_metric(cls, original: str, candidate: str) -> bool:
        """True if candidate introduces a metric absent from the original."""
        if not cls._METRIC_RE.search(candidate or ""):
            return False
        orig_metrics = set(cls._METRIC_RE.findall(original or ""))
        cand_metrics = set(cls._METRIC_RE.findall(candidate or ""))
        return not cand_metrics.issubset(orig_metrics)

    @classmethod
    def _validate_bullet_result(cls, result: Any, original: str) -> Optional[Dict[str, Any]]:
        if not isinstance(result, dict):
            return None
        for field in ("original", "improved_star", "formula_breakdown"):
            if field not in result:
                return None
        improved = str(result.get("improved_star", ""))
        if cls._hallucinated_metric(original, improved):
            logger.warning("[LLM] Rejected rewrite with unsupported metric")
            return None
        result["original"] = original
        return result

    @classmethod
    def _validate_summary_result(cls, result: Any) -> Optional[Dict[str, Any]]:
        if not isinstance(result, dict) or "tailored_summary" not in result:
            return None
        if "keywords_included" not in result:
            result["keywords_included"] = []
        if "tips" not in result:
            result["tips"] = []
        return result

    # -- deterministic truthful fallback ------------------------------------
    @classmethod
    def _fallback_star_rewrite(cls, bullet: str, target_keywords: Optional[List[str]] = None) -> Dict[str, Any]:
        cleaned = (bullet or "").strip().rstrip(".")
        kw_phrase = ""
        if target_keywords:
            # only reuse the keyword if already present (no invention)
            for kw in target_keywords:
                if kw.lower() in cleaned.lower():
                    kw_phrase = f" using {kw}"
                    break
        improved = f"{cleaned}{kw_phrase}."
        if not re.match(r"^(Led|Built|Designed|Implemented|Developed|Optimized|Automated|Lideré|Diseñé|Desarrollé|Implementé|Automaticé|Optimizé|Gestioné|Coordiné)\b", improved):
            improved = f"Delivered {improved[:1].lower() + improved[1:]}" if improved else "No source bullet provided."
        return {
            "original": bullet,
            "improved_star": improved,
            "formula_breakdown": {
                "action_verb": improved.split()[0] if improved else "",
                "accomplishment_x": cleaned,
                "measurement_y": "[missing metric — add one only if you can verify it]",
                "method_z": kw_phrase.strip() or "as described in the original",
            },
            "why_ats_loves_it": "Clearer verb and structure; no facts or metrics added.",
            "fallback": True,
        }
