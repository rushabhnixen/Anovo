"""
Plagiarism detection service using sentence embeddings and cosine similarity.
Models are loaded lazily on first request.
"""
from __future__ import annotations

from functools import lru_cache

import numpy as np
from transformers import AutoModel, AutoTokenizer

from config import settings


@lru_cache(maxsize=1)
def _load_model() -> tuple[AutoTokenizer, AutoModel]:
    tokenizer = AutoTokenizer.from_pretrained(settings.plagiarism_model)
    model = AutoModel.from_pretrained(settings.plagiarism_model)
    return tokenizer, model


def _mean_pooling(model_output, attention_mask):
    """Mean-pool token embeddings, weighting by attention mask."""
    token_embeddings = model_output[0]
    mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    return (token_embeddings * mask_expanded).sum(1) / mask_expanded.sum(1).clamp(min=1e-9)


def _get_embedding(text: str) -> np.ndarray:
    """Return the sentence embedding for *text*."""
    tokenizer, model = _load_model()
    encoded = tokenizer(
        text,
        padding=True,
        truncation=True,
        max_length=512,
        return_tensors="pt",
    )
    output = model(**encoded)
    embedding = _mean_pooling(output, encoded["attention_mask"])
    return embedding.detach().numpy()[0]


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Compute cosine similarity between two vectors."""
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


def check_plagiarism(text: str, reference_text: str) -> dict:
    """Compare *text* against *reference_text* and return similarity info."""
    emb_text = _get_embedding(text)
    emb_ref = _get_embedding(reference_text)
    score = _cosine_similarity(emb_text, emb_ref)
    threshold = settings.plagiarism_threshold

    return {
        "similarity_score": round(score, 4),
        "is_plagiarized": score >= threshold,
        "threshold": threshold,
    }
