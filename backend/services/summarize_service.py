"""
Summarization service.

Uses Groq LLM when available; falls back to local BART model.
"""
from __future__ import annotations

import re

from config import settings


def summarize(text: str, mode: str = "paragraph", max_length: int = 150) -> str:
    """Return a summary of *text* in paragraph or bullet mode."""
    if settings.groq_api_key:
        return _summarize_groq(text, mode)
    return _summarize_bart(text, mode, max_length)


def _summarize_groq(text: str, mode: str) -> str:
    from services.groq_client import groq_chat

    if mode == "bullet":
        instruction = (
            "Summarize the following text as a concise bullet-point list. "
            "Use a bullet character (•) for each point. Return ONLY the bullet points."
        )
    else:
        instruction = (
            "Summarize the following text in a clear, concise paragraph. "
            "Return ONLY the summary — no labels, no preamble."
        )

    return groq_chat(
        system_prompt="You are a professional summarization assistant.",
        user_prompt=f"{instruction}\n\nText:\n{text}",
        temperature=0.3,
        max_tokens=512,
    )


# ── BART fallback ────────────────────────────────────────────────────────────

def _summarize_bart(text: str, mode: str, max_length: int) -> str:  # pragma: no cover
    from functools import lru_cache
    from transformers import BartForConditionalGeneration, BartTokenizer

    @lru_cache(maxsize=1)
    def _load():
        tok = BartTokenizer.from_pretrained(settings.summarize_model)
        mod = BartForConditionalGeneration.from_pretrained(settings.summarize_model)
        return tok, mod

    tokenizer, model = _load()
    inputs = tokenizer(text, max_length=1024, truncation=True, return_tensors="pt")
    ids = model.generate(
        inputs["input_ids"], num_beams=4, max_length=max_length,
        min_length=30, length_penalty=2.0, early_stopping=True,
    )
    summary = tokenizer.decode(ids[0], skip_special_tokens=True)
    if mode == "bullet":
        sentences = re.split(r"(?<=[.!?])\s+", summary.strip())
        return "\n".join(f"• {s.strip()}" for s in sentences if s.strip())
    return summary
