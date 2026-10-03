"""Local HF provider: validates contract without requiring torch/llama.cpp."""
import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core import llm_engine as engine_mod
from app.core.llm_engine import LLMEngine


def test_local_hf_in_supported_providers():
    assert "local_hf" in engine_mod.SUPPORTED_PROVIDERS


def _without_local_runtime():
    """Patch _call_local to simulate 'no runtime installed' (no HF download)."""
    orig = LLMEngine.__dict__["_call_local"]
    LLMEngine._call_local = classmethod(lambda cls, prompt: None)  # type: ignore
    return orig


def test_local_hf_without_runtime_falls_back_truthfully():
    orig = _without_local_runtime()
    try:
        out = asyncio.run(
            LLMEngine.rewrite_bullet("Built REST endpoints with Python.", provider="local_hf")
        )
    finally:
        LLMEngine._call_local = orig  # type: ignore
    assert "25%" not in out["improved_star"]
    assert "[missing metric" in out["formula_breakdown"]["measurement_y"]


def test_assistant_without_runtime_is_explicit_fallback():
    orig = _without_local_runtime()
    try:
        out = asyncio.run(
            LLMEngine.generate_assistant_answer(
                "¿Qué mejoro?", "Backend dev with Python.", "Python role", "", provider="local_hf"
            )
        )
    finally:
        LLMEngine._call_local = orig  # type: ignore
    assert out["fallback"] is True
    assert out["answer"]
