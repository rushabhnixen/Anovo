"""
Translation service using Helsinki-NLP OpusMT models.
Models are loaded lazily and cached per language pair.
"""
from __future__ import annotations

from functools import lru_cache

from transformers import MarianMTModel, MarianTokenizer


@lru_cache(maxsize=32)
def _load_model(model_name: str) -> tuple[MarianTokenizer, MarianMTModel]:
    tokenizer = MarianTokenizer.from_pretrained(model_name)
    model = MarianMTModel.from_pretrained(model_name)
    return tokenizer, model


def _model_name(src: str, tgt: str) -> str:
    return f"Helsinki-NLP/opus-mt-{src}-{tgt}"


def translate(text: str, source_language: str, target_language: str) -> str:
    """Translate *text* from *source_language* to *target_language*."""
    model_name = _model_name(source_language, target_language)
    try:
        tokenizer, model = _load_model(model_name)
    except OSError:
        raise ValueError(
            f"Translation model not available for {source_language} → {target_language}. "
            f"Tried: {model_name}"
        )

    batch = tokenizer([text], return_tensors="pt", padding=True, truncation=True, max_length=512)
    translated_ids = model.generate(**batch, num_beams=4, early_stopping=True)
    return tokenizer.decode(translated_ids[0], skip_special_tokens=True)
