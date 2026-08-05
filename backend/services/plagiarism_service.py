"""
Plagiarism detection service.

Uses LLM (Groq / HF Inference) for semantic similarity analysis when available;
falls back to local sentence-transformer embeddings + cosine similarity.
"""
from __future__ import annotations

import json
import re

from config import settings


# Above this size a single LLM call cannot see both documents at once, so the
# comparison is chunked instead. QA hit this with a 5,000-word document.
_SINGLE_SHOT_LIMIT = 4000
_CHUNK_SIZE = 1500
# Ceiling on LLM refinement calls, so a 50k-vs-50k comparison stays responsive.
_MAX_REFINEMENTS = 5


def check_plagiarism(text: str, reference_text: str) -> dict:
    """Compare *text* against *reference_text* and return similarity info."""
    if max(len(text), len(reference_text)) > _SINGLE_SHOT_LIMIT:
        return _check_chunked(text, reference_text)
    try:
        result = _check_llm(text, reference_text)
    except RuntimeError:
        result = _check_local(text, reference_text)
    result.setdefault("compared_chunks", 1)
    return result


# ── Chunked comparison for long documents ────────────────────────────────────

def _chunk(text: str, size: int = _CHUNK_SIZE) -> list[str]:
    """Split into ~size-character chunks, preferring sentence boundaries."""
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    chunks: list[str] = []
    current = ""
    for sentence in sentences:
        if current and len(current) + len(sentence) + 1 > size:
            chunks.append(current)
            current = sentence
        else:
            current = f"{current} {sentence}".strip() if current else sentence
    if current:
        chunks.append(current)
    return chunks or [text]


def _shingles(text: str, width: int = 4) -> set[tuple[str, ...]]:
    """Word n-grams, the unit of comparison for the fast lexical pass."""
    words = re.findall(r"[^\W_]+", text.casefold())
    if len(words) < width:
        return {tuple(words)} if words else set()
    return {tuple(words[i:i + width]) for i in range(len(words) - width + 1)}


def _lexical_similarity(a: set, b: set) -> float:
    """Containment of *a* in *b* — the right measure for "was this copied?"."""
    if not a or not b:
        return 0.0
    return len(a & b) / len(a)


def _check_chunked(text: str, reference_text: str) -> dict:
    """Score long documents by matching each chunk against the reference.

    A cheap lexical pass scores every chunk pair, then only the strongest
    candidates are re-scored by the LLM, which keeps the call count bounded
    regardless of document size.
    """
    text_chunks = _chunk(text)
    ref_chunks = _chunk(reference_text)
    ref_shingles = [_shingles(chunk) for chunk in ref_chunks]

    best_per_chunk: list[float] = []
    candidates: list[tuple[float, int, int]] = []
    for i, chunk in enumerate(text_chunks):
        chunk_shingles = _shingles(chunk)
        scores = [_lexical_similarity(chunk_shingles, ref) for ref in ref_shingles]
        best = max(scores) if scores else 0.0
        best_per_chunk.append(best)
        if scores:
            candidates.append((best, i, scores.index(best)))

    # Re-score the most similar pairs semantically; lexical matching alone
    # misses paraphrased copying.
    candidates.sort(reverse=True)
    for _, text_idx, ref_idx in candidates[:_MAX_REFINEMENTS]:
        try:
            refined = _check_llm(text_chunks[text_idx], ref_chunks[ref_idx])
        except RuntimeError:
            break
        best_per_chunk[text_idx] = max(best_per_chunk[text_idx], refined["similarity_score"])

    # Weight by chunk length so a long document is not dominated by a stray
    # short paragraph.
    total_len = sum(len(chunk) for chunk in text_chunks) or 1
    score = sum(
        best * len(chunk) for best, chunk in zip(best_per_chunk, text_chunks)
    ) / total_len

    threshold = settings.plagiarism_threshold
    return {
        "similarity_score": round(min(1.0, max(0.0, score)), 4),
        "is_plagiarized": score >= threshold,
        "threshold": threshold,
        "compared_chunks": len(text_chunks),
    }


def _check_llm(text: str, reference_text: str) -> dict:
    from services.llm_client import llm_chat

    raw = llm_chat(
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
