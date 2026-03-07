"""
Plagiarism detection service.

Uses Groq LLM for semantic similarity analysis when available;
falls back to local sentence-transformer embeddings + cosine similarity.
"""
from __future__ import annotations

import json
import re

from config import settings


def check_plagiarism(text: str, reference_text: str) -> dict:
    """Compare *text* against *reference_text* and return similarity info."""
    if settings.groq_api_key:
        return _check_groq(text, reference_text)
    return _check_local(text, reference_text)


def _check_groq(text: str, reference_text: str) -> dict:
    from services.groq_client import groq_chat

    raw = groq_chat(
        system_prompt=(
            "You are a plagiarism detection expert. Compare two texts and determine "
            "their semantic similarity.\n\n"
            "Return ONLY a JSON object with exactly this structure:\n"
            '{"similarity_score": 0.XX}\n'
            "where the score is between 0.0 (completely different) and 1.0 (identical "
            "or clearly copied). Consider meaning, structure, and phrasing.\n"
            "No explanation, no markdown, just the JSON."
        ),
        user_prompt=(
            f"Text 1:\n{text}\n\n"
            f"Text 2:\n{reference_text}"
        ),
        temperature=0.1,
        max_tokens=64,
    )

    cleaned = re.sub(r"```json?\s*", "", raw).replace("```", "").strip()
    try:
        data = json.loads(cleaned)
        score = float(data["similarity_score"])
        score = max(0.0, min(1.0, score))
    except (json.JSONDecodeError, KeyError, ValueError):
        score = 0.5

    threshold = settings.plagiarism_threshold
    return {
        "similarity_score": round(score, 4),
        "is_plagiarized": score >= threshold,
        "threshold": threshold,
    }


# ── Local fallback ───────────────────────────────────────────────────────────

def _check_local(text: str, reference_text: str) -> dict:  # pragma: no cover
    from functools import lru_cache
    import numpy as np
    from transformers import AutoModel, AutoTokenizer

    @lru_cache(maxsize=1)
    def _load():
        tok = AutoTokenizer.from_pretrained(settings.plagiarism_model)
        mod = AutoModel.from_pretrained(settings.plagiarism_model)
        return tok, mod

    def _embed(txt: str):
        tokenizer, model = _load()
        enc = tokenizer(txt, padding=True, truncation=True, max_length=512, return_tensors="pt")
        out = model(**enc)
        mask = enc["attention_mask"].unsqueeze(-1).expand(out[0].size()).float()
        pooled = (out[0] * mask).sum(1) / mask.sum(1).clamp(min=1e-9)
        return pooled.detach().numpy()[0]

    a, b = _embed(text), _embed(reference_text)
    na, nb = np.linalg.norm(a), np.linalg.norm(b)
    score = float(np.dot(a, b) / (na * nb)) if na and nb else 0.0
    threshold = settings.plagiarism_threshold
    return {
        "similarity_score": round(score, 4),
        "is_plagiarized": score >= threshold,
        "threshold": threshold,
    }
