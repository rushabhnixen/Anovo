"""
Summarization service using BART (facebook/bart-large-cnn).
Models are loaded lazily on first request.
"""
from __future__ import annotations

import re
from functools import lru_cache

from transformers import BartForConditionalGeneration, BartTokenizer

from config import settings


@lru_cache(maxsize=1)
def _load_model() -> tuple[BartTokenizer, BartForConditionalGeneration]:
    tokenizer = BartTokenizer.from_pretrained(settings.summarize_model)
    model = BartForConditionalGeneration.from_pretrained(settings.summarize_model)
    return tokenizer, model


def summarize(text: str, mode: str = "paragraph", max_length: int = 150) -> str:
    """Return a summary of *text* in paragraph or bullet mode."""
    tokenizer, model = _load_model()

    inputs = tokenizer(
        text,
        max_length=1024,
        truncation=True,
        return_tensors="pt",
    )

    summary_ids = model.generate(
        inputs["input_ids"],
        num_beams=4,
        max_length=max_length,
        min_length=30,
        length_penalty=2.0,
        early_stopping=True,
    )

    summary = tokenizer.decode(summary_ids[0], skip_special_tokens=True)

    if mode == "bullet":
        return _to_bullets(summary)
    return summary


def _to_bullets(text: str) -> str:
    """Convert paragraph text to a bullet-point list."""
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    bullets = [f"• {s.strip()}" for s in sentences if s.strip()]
    return "\n".join(bullets)
