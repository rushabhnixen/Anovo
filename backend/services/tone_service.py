"""
Tone detection service.

Uses LLM (Groq / HF Inference) when available and a fast deterministic
heuristic if the provider is unavailable or returns malformed scores.
"""
from __future__ import annotations

import json
import re

TONE_LABELS = [
    "formal", "casual", "persuasive", "informative",
    "humorous", "sarcastic", "optimistic", "pessimistic",
]


def detect_tone(text: str) -> dict:
    """Classify *text* into tone categories and return scored results."""
    try:
        return _detect_llm(text)
    except (RuntimeError, TypeError, ValueError):
        return _build_response(_heuristic_scores(text))


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

    return _build_response(_parse_scores(raw))


def _parse_scores(raw: str) -> dict[str, float]:
    """Extract, validate, and complete an LLM tone-score response."""
    cleaned = re.sub(r"```(?:json)?\s*", "", raw, flags=re.IGNORECASE)
    cleaned = cleaned.replace("```", "").strip()
    object_match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
    if not object_match:
        raise ValueError("Tone response did not contain a JSON object")

    try:
        payload = json.loads(object_match.group(0))
    except json.JSONDecodeError as exc:
        raise ValueError("Tone response contained invalid JSON") from exc
    if not isinstance(payload, dict):
        raise ValueError("Tone response must be a JSON object")

    scores: dict[str, float] = {}
    for label in TONE_LABELS:
        value = payload.get(label)
        if isinstance(value, str):
            value = value.strip().rstrip("%")
        try:
            score = float(value)
        except (TypeError, ValueError):
            continue
        if score > 1 and score <= 100:
            score /= 100
        scores[label] = min(1.0, max(0.0, score))

    if len(scores) < 4:
        raise ValueError("Tone response did not contain enough valid scores")
    if max(scores.values()) - min(scores.values()) < 0.02:
        raise ValueError("Tone response contained uninformative equal scores")

    fallback = _heuristic_scores("")
    return {label: scores.get(label, fallback[label]) for label in TONE_LABELS}


def _heuristic_scores(text: str) -> dict[str, float]:
    """Return distinct multi-label scores without loading a local ML model."""
    lowered = text.casefold()
    words = re.findall(r"[\w']+", lowered)
    word_set = set(words)

    signals = {
        "formal": {"therefore", "furthermore", "regarding", "pursuant", "shall", "respectfully"},
        "casual": {"hey", "hi", "yeah", "yep", "cool", "awesome", "gonna", "wanna", "lol"},
        "persuasive": {"must", "should", "need", "essential", "critical", "recommend", "choose", "act"},
        "informative": {"because", "according", "data", "research", "report", "means", "includes", "shows"},
        "humorous": {"lol", "haha", "joke", "funny", "hilarious", "pun"},
        "sarcastic": {"obviously", "sure", "totally", "brilliant", "right"},
        "optimistic": {"hope", "great", "improve", "success", "opportunity", "positive", "excited"},
        "pessimistic": {"fail", "failure", "worse", "hopeless", "problem", "impossible", "unfortunately"},
    }
    bases = {
        "formal": 0.24,
        "casual": 0.18,
        "persuasive": 0.20,
        "informative": 0.38,
        "humorous": 0.08,
        "sarcastic": 0.06,
        "optimistic": 0.16,
        "pessimistic": 0.12,
    }
    scores = {
        label: base + min(0.54, len(word_set & signals[label]) * 0.18)
        for label, base in bases.items()
    }

    if re.search(r"\b(?:i'm|you're|we're|don't|can't|it's)\b", lowered):
        scores["casual"] += 0.16
    if "!" in text:
        scores["persuasive"] += 0.08
        scores["optimistic"] += 0.06
    if re.search(r"(?:😂|🤣|😄|;-\)|:\))", text):
        scores["humorous"] += 0.35
        scores["casual"] += 0.12
    if re.search(r"\b(?:yeah right|as if|thanks a lot|what a surprise)\b", lowered):
        scores["sarcastic"] += 0.55
    if words and sum(1 for char in text if char.isupper()) > max(6, len(text) * 0.25):
        scores["persuasive"] += 0.16

    return {label: min(0.98, round(score, 4)) for label, score in scores.items()}


def _build_response(scores: dict[str, float]) -> dict:
    tones = sorted(
        [{"label": label, "score": round(scores[label], 4)} for label in TONE_LABELS],
        key=lambda tone: tone["score"],
        reverse=True,
    )
    return {"tones": tones, "primary_tone": tones[0]["label"]}
