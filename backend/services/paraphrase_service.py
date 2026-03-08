"""
Paraphrase service.

Uses LLM (Groq / HF Inference) when available; falls back to local T5 model.
Premium mode uses GitHub Models (Meta-Llama-3.1-405B-Instruct).
"""
from __future__ import annotations

import logging
import re

from config import settings

logger = logging.getLogger(__name__)

_CHUNK_CHAR_LIMIT = 3500

INTENSITY_PROMPTS: dict[int, str] = {
    1: (
        "Paraphrase the following text with minimal changes — only replace a few words "
        "with synonyms while keeping the same sentence structure and length."
    ),
    2: (
        "Paraphrase the following text with light rewording — adjust phrasing slightly "
        "but keep the original structure mostly intact."
    ),
    3: (
        "Paraphrase the following text naturally — rewrite it clearly while fully "
        "preserving the original meaning. Vary the sentence structure moderately."
    ),
    4: (
        "Paraphrase the following text with strong rewording — significantly restructure "
        "the sentences and use different vocabulary while keeping the exact same meaning."
    ),
    5: (
        "Paraphrase the following text creatively — completely reimagine how the idea is "
        "expressed using a fresh style, different sentence structures, and varied vocabulary. "
        "The meaning must remain identical but the wording should be as different as possible."
    ),
}

_SYSTEM_PROMPT = (
    "You are a professional writing assistant specialised in paraphrasing. "
    "Return ONLY the paraphrased text — no explanations, no labels, "
    "no quotation marks, no preamble."
)


def paraphrase(text: str, intensity: int = 3) -> tuple[str, str]:
    """Return (paraphrased_text, model_used) at the given intensity (1-5)."""
    try:
        return _paraphrase_llm(text, intensity), "standard"
    except RuntimeError:
        return _paraphrase_t5(text, intensity), "standard"


def paraphrase_premium(text: str, intensity: int = 3, model: str = "Meta-Llama-3.1-405B-Instruct") -> tuple[str, str]:
    """Paraphrase using a premium GitHub Models model. Returns (text, model_used)."""
    try:
        return _paraphrase_llm_premium(text, intensity, model)
    except RuntimeError:
        return _paraphrase_llm(text, intensity), "standard"


def _split_into_chunks(text: str) -> list[str]:
    """Split text into paragraph-based chunks, each under _CHUNK_CHAR_LIMIT."""
    paragraphs = re.split(r"\n\s*\n", text.strip())
    chunks: list[str] = []
    current = ""

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        if current and len(current) + len(para) + 2 > _CHUNK_CHAR_LIMIT:
            chunks.append(current)
            current = para
        else:
            current = f"{current}\n\n{para}" if current else para

    if current:
        chunks.append(current)

    return chunks if chunks else [text]


def _paraphrase_with_fn(text: str, intensity: int, chat_fn) -> str:
    """Shared chunking logic for both free and premium paraphrasing."""
    instruction = INTENSITY_PROMPTS.get(intensity, INTENSITY_PROMPTS[3])
    chunks = _split_into_chunks(text)

    parts: list[str] = []
    for i, chunk in enumerate(chunks):
        context = ""
        if len(chunks) > 1:
            context = (
                f" This is section {i + 1} of {len(chunks)} "
                f"— maintain a consistent voice."
            )
            logger.info(
                "Paraphrasing chunk %d/%d (%d chars)",
                i + 1, len(chunks), len(chunk),
            )
        part = chat_fn(
            system_prompt=_SYSTEM_PROMPT,
            user_prompt=f"{instruction}{context}\n\nText to paraphrase:\n{chunk}\n\nParaphrased version:",
            temperature=0.4 + (intensity - 1) * 0.15,
            max_tokens=4096,
        )
        parts.append(part)

    return "\n\n".join(parts)


def _paraphrase_llm(text: str, intensity: int) -> str:
    from services.llm_client import llm_chat

    return _paraphrase_with_fn(text, intensity, llm_chat)


def _paraphrase_llm_premium(text: str, intensity: int, model: str) -> tuple[str, str]:
    from services.llm_client import llm_chat_premium

    model_used = "standard"

    def _chat_fn(system_prompt, user_prompt, temperature, max_tokens):
        nonlocal model_used
        content, mu = llm_chat_premium(
            system_prompt, user_prompt, model=model,
            temperature=temperature, max_tokens=max_tokens,
        )
        model_used = mu
        return content

    result = _paraphrase_with_fn(text, intensity, _chat_fn)
    return result, model_used


# ── T5 fallback ──────────────────────────────────────────────────────────────

INTENSITY_PARAMS: dict[int, dict] = {
    1: {"temperature": 0.5, "num_beams": 2, "top_k": 50},
    2: {"temperature": 0.7, "num_beams": 4, "top_k": 100},
    3: {"temperature": 1.0, "num_beams": 5, "top_k": 120},
    4: {"temperature": 1.3, "num_beams": 8, "top_k": 150},
    5: {"temperature": 1.6, "num_beams": 10, "top_k": 200},
}


def _paraphrase_t5(text: str, intensity: int) -> str:  # pragma: no cover
    from functools import lru_cache
    from transformers import T5ForConditionalGeneration, T5Tokenizer

    @lru_cache(maxsize=1)
    def _load():
        tok = T5Tokenizer.from_pretrained(settings.paraphrase_model)
        mod = T5ForConditionalGeneration.from_pretrained(settings.paraphrase_model)
        return tok, mod

    tokenizer, model = _load()
    params = INTENSITY_PARAMS.get(intensity, INTENSITY_PARAMS[3])
    encoding = tokenizer.encode_plus(
        f"paraphrase: {text} </s>",
        padding="max_length", max_length=256, truncation=True, return_tensors="pt",
    )
    ids = model.generate(
        input_ids=encoding["input_ids"], attention_mask=encoding["attention_mask"],
        max_length=256, early_stopping=True, num_beams=params["num_beams"],
        num_return_sequences=1, no_repeat_ngram_size=2,
        temperature=params["temperature"], top_k=params["top_k"],
        do_sample=(params["temperature"] > 1.0),
    )
    return tokenizer.decode(ids[0], skip_special_tokens=True)
