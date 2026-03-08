"""
Tone detection service.

Uses LLM (Groq / HF Inference) when available; falls back to local zero-shot classification.
"""
from __future__ import annotations

import json
import re

from config import settings

TONE_LABELS = [
    "formal", "casual", "persuasive", "informative",
    "humorous", "sarcastic", "optimistic", "pessimistic",
]


def detect_tone(text: str) -> dict:
    """Classify *text* into tone categories and return scored results."""
    try:
        return _detect_llm(text)
    except RuntimeError:
        return _detect_local(text)


def _detect_llm(text: str) -> dict:
    from services.llm_client import llm_chat

    labels_str = ", ".join(TONE_LABELS)
    raw = llm_chat(
        system_prompt=(
            "You are a tone analysis expert. Analyze text and rate how strongly each "
            "tone is present on a scale from 0.0 to 1.0.\n"
            f"The tones to evaluate are: {labels_str}\n\n"
            "Return ONLY a JSON object mapping each tone label to its score. Example:\n"
            '{"formal": 0.85, "casual": 0.05, ...}\n'
            "No explanation, no markdown, just the JSON object."
        ),
        user_prompt=f"Analyze the tone of this text:\n\n{text}",
        temperature=0.2,
        max_tokens=256,
    )

    # Parse JSON from response (handle markdown code blocks if present)
    cleaned = re.sub(r"```json?\s*", "", raw).replace("```", "").strip()
    try:
        scores = json.loads(cleaned)
    except json.JSONDecodeError:
        # Fallback: give all tones equal score
        scores = {label: 0.5 for label in TONE_LABELS}

    tones = sorted(
        [{"label": k, "score": round(float(v), 4)} for k, v in scores.items()],
        key=lambda t: t["score"],
        reverse=True,
    )

    return {
        "tones": tones,
        "primary_tone": tones[0]["label"] if tones else "unknown",
    }


# ── Local fallback ───────────────────────────────────────────────────────────

def _detect_local(text: str) -> dict:  # pragma: no cover
    from functools import lru_cache
    from transformers import pipeline

    @lru_cache(maxsize=1)
    def _load():
        return pipeline("zero-shot-classification", model=settings.tone_model)

    classifier = _load()
    result = classifier(text, candidate_labels=TONE_LABELS, multi_label=True)
    tones = [
        {"label": label, "score": round(score, 4)}
        for label, score in zip(result["labels"], result["scores"])
    ]
    return {"tones": tones, "primary_tone": tones[0]["label"] if tones else "unknown"}
