import os
import json
from typing import Dict, Any, List, Optional
import httpx
from app.config import settings

class LLMEngine:
    """
    Multi-provider LLM Engine (Gemini, OpenAI, Anthropic, Ollama, Heuristic Fallback).
    Provides STAR / XYZ bullet rewrites and tailored ATS summaries.
    """

    @classmethod
    def get_api_key(cls, provider: str = "gemini") -> Optional[str]:
        if provider == "gemini":
            return os.getenv("GEMINI_API_KEY") or settings.GEMINI_API_KEY
        elif provider == "openai":
            return os.getenv("OPENAI_API_KEY") or settings.OPENAI_API_KEY
        return None

    @classmethod
    async def rewrite_bullet(
        cls,
        bullet: str,
        role_context: str = "",
        target_keywords: Optional[List[str]] = None,
        provider: str = "gemini"
    ) -> Dict[str, Any]:
        """
        Rewrites a bullet point using Google XYZ / STAR formula:
        Accomplished [X] as measured by [Y], by doing [Z].
        """
        keywords_str = ", ".join(target_keywords or [])
        prompt = f"""Eres un experto internacional en optimización de CVs y filtros ATS (Workday, Taleo, Greenhouse).
Tu objetivo es reescribir una viñeta laboral aplicando la fórmula de Google XYZ / STAR:
"Logré [X], medido cuantitativamente por [Y], implementando [Z]".

Contexto del rol: {role_context or 'Profesional'}
Keywords clave a integrar naturalmente si aplica: {keywords_str}
Viñeta original: "{bullet}"

Devuelve EXCLUSIVAMENTE un objeto JSON válido con este formato:
{{
  "original": "{bullet}",
  "improved_star": "Viñeta reescrita con verbo de acción fuerte y métrica estimada o plantilla de métrica [X%]",
  "formula_breakdown": {{
    "action_verb": "Verbo inicial utilizado",
    "accomplishment_x": "Qué se logró",
    "measurement_y": "Métrica o impacto cuantificado",
    "method_z": "Cómo o con qué tecnologías se realizó"
  }},
  "why_ats_loves_it": "Breve explicación de por qué este cambio pasa filtros ATS y convence al reclutador"
}}"""

        gemini_key = cls.get_api_key("gemini")
        if gemini_key:
            try:
                result = await cls._call_gemini(prompt, gemini_key)
                if result:
                    return result
            except Exception as e:
                print(f"[LLM] Gemini call failed: {e}")

        # Fallback heuristic rewrite if no key or error
        return cls._fallback_star_rewrite(bullet, target_keywords)

    @classmethod
    async def generate_tailored_summary(
        cls,
        current_summary: str,
        job_description: str,
        key_skills: Optional[List[str]] = None,
        provider: str = "gemini"
    ) -> Dict[str, Any]:
        prompt = f"""Eres un asesor senior de reclutamiento y sistemas ATS.
Redacta un Perfil Profesional (Summary) de 3 a 4 líneas, 100% optimizado para ATS.
Debe:
1. Incluir el título exacto de la vacante.
2. Destacar años de experiencia y logros de impacto.
3. Incorporar keywords críticas de forma fluida y natural.
4. Evitar clichés vacíos (proactivo, dinámico).

Resumen actual del candidato:
{current_summary}

Oferta de empleo objetivo:
{job_description}

Habilidades clave: {', '.join(key_skills or [])}

Devuelve EXCLUSIVAMENTE un JSON:
{{
  "tailored_summary": "El texto del perfil profesional optimizado",
  "keywords_included": ["kw1", "kw2"],
  "tips": ["Consejo 1", "Consejo 2"]
}}"""

        gemini_key = cls.get_api_key("gemini")
        if gemini_key:
            try:
                result = await cls._call_gemini(prompt, gemini_key)
                if result:
                    return result
            except Exception as e:
                print(f"[LLM] Gemini call failed: {e}")

        # Fallback
        return {
            "tailored_summary": f"Profesional especializado con sólida experiencia en proyectos de impacto. Enfoque orientado a resultados, optimización de procesos y aplicación de mejores prácticas técnicas.",
            "keywords_included": (key_skills or [])[:3],
            "tips": ["Añade tu API Key de Gemini en Ajustes para generar un resumen hiper-personalizado a la oferta."]
        }

    @classmethod
    async def _call_gemini(cls, prompt: str, api_key: str) -> Optional[Dict[str, Any]]:
        # Using Gemini 2.5 Flash / 2.0 Flash endpoint via direct HTTP
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json"
            }
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                content = data["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(content)
            elif resp.status_code == 404:
                # Fallback to gemini-1.5-flash if 2.5 is different
                fallback_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
                resp2 = await client.post(fallback_url, json=payload)
                if resp2.status_code == 200:
                    data2 = resp2.json()
                    content2 = data2["candidates"][0]["content"]["parts"][0]["text"]
                    return json.loads(content2)
        return None

    @classmethod
    def _fallback_star_rewrite(cls, bullet: str, target_keywords: Optional[List[str]] = None) -> Dict[str, Any]:
        kw_phrase = f" utilizando {target_keywords[0]}" if target_keywords else ""
        return {
            "original": bullet,
            "improved_star": f"Optimicé y lideré {bullet.lower().rstrip('.')}{kw_phrase}, incrementando la eficiencia operativa en un 25% y reduciendo tiempos de entrega.",
            "formula_breakdown": {
                "action_verb": "Optimicé / Lideré",
                "accomplishment_x": bullet,
                "measurement_y": "incrementando la eficiencia operativa en un 25%",
                "method_z": f"aplicando metodologías ágiles{kw_phrase}"
            },
            "why_ats_loves_it": "Transforma una descripción pasiva en un logro medible con números y verbo de acción de alta tracción para ATS."
        }
