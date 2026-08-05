"""
Summarization service.

Uses LLM (Groq / HF Inference) when available; falls back to local BART model.
"""
from __future__ import annotations

import re

from config import settings


def summarize(text: str, mode: str = "paragraph", max_length: int = 150) -> str:
    """Return a summary of *text* in paragraph or bullet mode."""
    try:
        return _summarize_llm(text, mode, max_length)
    except RuntimeError:
        return _summarize_bart(text, mode, max_length)


# Without an explicit directive the model answers in English regardless of the
# input language, so Hindi (and every other non-English) input came back
# translated instead of summarized.
_SAME_LANGUAGE = (
    "Write the summary in the SAME language as the input text. "
    "If the text is in Hindi, answer in Hindi; if it is in Spanish, answer in "
    "Spanish; and so on. Do not translate."
)


# Asking for "about 150 words" from a two-line input leaves the model two bad
# options: pad with invented detail, or return a single sentence. Both were
# reported — as added information and as a one-sentence summary.
_GROUNDING = (
    "Use only information that is present in the source text. Do not add facts, "
    "figures, examples, opinions or conclusions of your own, and do not infer "
    "detail that is not stated."
)


def _target_words(text: str, max_length: int) -> int:
    """Words to request: about half the source, and never more than it.

    A fixed floor would reintroduce the bug for very short inputs — a 9-word
    sentence must not be given a 10-word target.
    """
    source_words = len(re.findall(r"[^\W_]+", text))
    if not source_words:
        return max_length
    return max(1, min(max_length, source_words // 2 or 1))


def _summarize_llm(text: str, mode: str, max_length: int) -> str:
    from services.llm_client import llm_chat

    target = _target_words(text, max_length)

    if mode == "bullet":
        instruction = (
            "Summarize the following text as a concise bullet-point list. "
            f"Use a bullet character (•) for each point and target about {target} words total. "
            "Prioritize claims, decisions, evidence, and action items. Return ONLY the bullet points. "
            f"{_GROUNDING} {_SAME_LANGUAGE}"
        )
    else:
        instruction = (
            f"Summarize the following text in a clear paragraph of about {target} words. "
            "The summary must be shorter than the source text; if the source is already "
            "brief, return a correspondingly brief summary rather than padding it. "
            "Preserve the central claim, essential evidence, names, numbers, and qualifications. "
            "Return ONLY the summary — no labels, no preamble. "
            f"{_GROUNDING} {_SAME_LANGUAGE}"
        )

    return llm_chat(
        system_prompt=(
            "You are a professional summarization assistant. You always reply in "
            "the same language as the text you are given, and you never introduce "
            "information that is not in the source."
        ),
        user_prompt=f"{instruction}\n\nText:\n{text}",
        temperature=0.3,
        max_tokens=min(700, max_length + 100),
    )


# ── BART fallback ────────────────────────────────────────────────────────────

def _summarize_bart(text: str, mode: str, max_length: int) -> str:  # pragma: no cover
    from functools import lru_cache
    from transformers import BartForConditionalGeneration, BartTokenizer

    @lru_cache(maxsize=1)
    def _load():
        tok = BartTokenizer.from_pretrained(settings.summarize_model)
        mod = BartForConditionalGeneration.from_pretrained(settings.summarize_model)
        return tok, mod

    tokenizer, model = _load()
    inputs = tokenizer(text, max_length=1024, truncation=True, return_tensors="pt")
    ids = model.generate(
        inputs["input_ids"], num_beams=4, max_length=max_length,
        min_length=30, length_penalty=2.0, early_stopping=True,
    )
    summary = tokenizer.decode(ids[0], skip_special_tokens=True)
    if mode == "bullet":
        sentences = re.split(r"(?<=[.!?])\s+", summary.strip())
        return "\n".join(f"• {s.strip()}" for s in sentences if s.strip())
    return summary
