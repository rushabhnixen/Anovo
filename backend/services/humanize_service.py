"""
AI Text Humanizer service.

Uses LLM (Groq / HF Inference) for high-quality humanization when available.
Processes large texts by chunking into paragraphs and humanizing each chunk
separately, then reassembling. Falls back to a local pipeline otherwise.

Premium mode uses GitHub Models (Meta-Llama-3.1-405B-Instruct) for superior
rewriting quality.
"""
from __future__ import annotations

import logging
import re

from config import settings

logger = logging.getLogger(__name__)

# Approximate character limit per chunk — keeps each LLM call under token limits
_CHUNK_CHAR_LIMIT = 2500


def humanize(text: str) -> dict:
    """Transform AI-generated text into natural, human-sounding writing."""
    try:
        return _humanize_llm(text)
    except RuntimeError:
        return _humanize_pipeline(text)


def humanize_premium(text: str) -> dict:
    """Humanize using the premium 405B model."""
    try:
        return _humanize_llm_premium(text)
    except RuntimeError:
        return _humanize_llm(text)


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


_SYSTEM_PROMPT = """You are a skilled ghostwriter. Rewrite AI-generated text so it sounds naturally human-written.

KEY RULES:
- Vary sentence length: mix short (3-6 words), medium, and long sentences. Never start 3+ sentences the same way.
- Use everyday words and contractions (don't, it's, can't). Avoid stiff academic language (utilize, facilitate, commence) and AI-signature phrases (delve, crucial, landscape, comprehensive, leverage, robust, cutting-edge).
- Add personality: mild opinions, dashes, asides, occasional rhetorical questions or informal transitions (Thing is, Basically, So, Now, Honestly).
- Vary paragraph length. Some 1-2 sentences, some longer. Don't follow rigid templates.
- Preserve all facts and arguments. Do NOT add information or meta-commentary.
- Return ONLY the rewritten text. Keep roughly the same length (within 15%)."""


def _humanize_llm(text: str) -> dict:
    from services.llm_client import llm_chat

    return _process_chunks(text, llm_chat)


def _humanize_llm_premium(text: str) -> dict:
    from services.llm_client import llm_chat_premium

    return _process_chunks(text, llm_chat_premium)


def _process_chunks(text: str, chat_fn) -> dict:
    """Shared logic for both free and premium humanization."""
    chunks = _split_into_chunks(text)

    if len(chunks) == 1:
        result = chat_fn(
            system_prompt=_SYSTEM_PROMPT,
            user_prompt=f"Rewrite this text to sound completely human-written:\n\n{chunks[0]}",
            temperature=0.7,
            max_tokens=4096,
        )
        return {"humanized": result, "steps": None}

    humanized_parts: list[str] = []
    for i, chunk in enumerate(chunks):
        logger.info("Humanizing chunk %d/%d (%d chars)", i + 1, len(chunks), len(chunk))
        part = chat_fn(
            system_prompt=_SYSTEM_PROMPT,
            user_prompt=(
                f"Rewrite this text to sound completely human-written. "
                f"This is section {i + 1} of {len(chunks)} — maintain a consistent "
                f"voice throughout:\n\n{chunk}"
            ),
            temperature=0.7,
            max_tokens=4096,
        )
        humanized_parts.append(part)

    return {
        "humanized": "\n\n".join(humanized_parts),
        "steps": {"chunks_processed": str(len(chunks))},
    }


# ── Local pipeline fallback ──────────────────────────────────────────────────

def _humanize_pipeline(text: str) -> dict:  # pragma: no cover
    import random
    from services.paraphrase_service import paraphrase
    from services.translate_service import translate

    CONTRACTIONS = {
        "do not": "don't", "does not": "doesn't", "did not": "didn't",
        "is not": "isn't", "are not": "aren't", "was not": "wasn't",
        "will not": "won't", "would not": "wouldn't", "cannot": "can't",
        "I am": "I'm", "you are": "you're", "it is": "it's",
        "we are": "we're", "they are": "they're", "that is": "that's",
    }
    MARKERS = ["Honestly, ", "Basically, ", "Look, ", "Actually, ", "Frankly, "]

    paraphrased = paraphrase(text, intensity=3)
    try:
        french = translate(paraphrased, "en", "fr")
        back = translate(french, "fr", "en")
    except Exception:
        back = paraphrased

    for formal, short in CONTRACTIONS.items():
        back = re.sub(r"\b" + re.escape(formal) + r"\b", short, back, flags=re.IGNORECASE)

    sentences = re.split(r"(?<=[.!?])\s+", back.strip())
    if sentences:
        idx = random.randint(0, len(sentences) - 1)
        m = random.choice(MARKERS)
        sentences[idx] = m + sentences[idx][0].lower() + sentences[idx][1:]
    humanized = " ".join(sentences)

    return {
        "humanized": humanized,
        "steps": {"paraphrased": paraphrased, "back_translated": back},
    }
