"""
Tone detection service using zero-shot classification.
Models are loaded lazily on first request.
"""
from __future__ import annotations

from functools import lru_cache

from transformers import pipeline

from config import settings

TONE_LABELS = [
    "formal",
    "casual",
    "persuasive",
    "informative",
    "humorous",
    "sarcastic",
    "optimistic",
    "pessimistic",
]


@lru_cache(maxsize=1)
def _load_pipeline():
    return pipeline(
        "zero-shot-classification",
        model=settings.tone_model,
    )


def detect_tone(text: str) -> dict:
    """Classify *text* into tone categories and return scored results."""
    classifier = _load_pipeline()
    result = classifier(text, candidate_labels=TONE_LABELS, multi_label=True)

    tones = [
        {"label": label, "score": round(score, 4)}
        for label, score in zip(result["labels"], result["scores"])
    ]

    return {
        "tones": tones,
        "primary_tone": tones[0]["label"] if tones else "unknown",
    }
