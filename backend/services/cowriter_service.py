"""
Co-writer service using text generation (distilgpt2).
Models are loaded lazily on first request.
"""
from __future__ import annotations

from functools import lru_cache

from transformers import pipeline

from config import settings


@lru_cache(maxsize=1)
def _load_pipeline():
    return pipeline(
        "text-generation",
        model=settings.cowriter_model,
    )


def generate_suggestions(text: str, max_tokens: int = 50, num_suggestions: int = 3) -> list[str]:
    """Generate *num_suggestions* autocomplete continuations for *text*."""
    generator = _load_pipeline()

    results = generator(
        text,
        max_new_tokens=max_tokens,
        num_return_sequences=num_suggestions,
        do_sample=True,
        temperature=0.9,
        top_k=50,
        top_p=0.95,
        truncation=True,
    )

    suggestions: list[str] = []
    for r in results:
        generated = r["generated_text"]
        # Strip the original prompt to return only the new text
        continuation = generated[len(text):].strip()
        if continuation:
            suggestions.append(continuation)

    return suggestions
