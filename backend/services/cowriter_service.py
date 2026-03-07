"""
Co-writer (autocomplete) service.

Uses Groq LLM when available; falls back to local distilgpt2.
"""
from __future__ import annotations

from config import settings


def generate_suggestions(
    text: str, max_tokens: int = 50, num_suggestions: int = 3
) -> list[str]:
    """Generate *num_suggestions* autocomplete continuations for *text*."""
    if settings.groq_api_key:
        return _suggest_groq(text, max_tokens, num_suggestions)
    return _suggest_local(text, max_tokens, num_suggestions)


def _suggest_groq(text: str, max_tokens: int, n: int) -> list[str]:
    from services.groq_client import groq_chat

    raw = groq_chat(
        system_prompt=(
            f"You are a creative writing autocomplete engine. "
            f"Given the text below, produce exactly {n} different possible "
            f"continuations. Each continuation should be a natural next sentence "
            f"or clause (roughly {max_tokens} words max).\n\n"
            f"Return each continuation on its own line, prefixed with a number "
            f"and a period (e.g. '1. ...'). Return ONLY the numbered continuations."
        ),
        user_prompt=f"Continue this text:\n\n{text}",
        temperature=0.9,
        max_tokens=max_tokens * n + 100,
    )

    suggestions: list[str] = []
    for line in raw.strip().splitlines():
        line = line.strip()
        # Strip leading number + period/parenthesis
        cleaned = line.lstrip("0123456789").lstrip(".)")
        cleaned = cleaned.strip(" -–—")
        if cleaned:
            suggestions.append(cleaned)

    return suggestions[:n]


# ── Local fallback ───────────────────────────────────────────────────────────

def _suggest_local(text: str, max_tokens: int, n: int) -> list[str]:  # pragma: no cover
    from functools import lru_cache
    from transformers import pipeline

    @lru_cache(maxsize=1)
    def _load():
        return pipeline("text-generation", model=settings.cowriter_model)

    gen = _load()
    results = gen(
        text, max_new_tokens=max_tokens, num_return_sequences=n,
        do_sample=True, temperature=0.9, top_k=50, top_p=0.95, truncation=True,
    )
    suggestions = []
    for r in results:
        cont = r["generated_text"][len(text):].strip()
        if cont:
            suggestions.append(cont)
    return suggestions
