"""
AI Text Humanizer service.

Uses LLM (Groq / HF Inference) for high-quality humanization when available.
Processes large texts by chunking into paragraphs and humanizing each chunk
separately, then reassembling. Falls back to a local pipeline otherwise.

Premium mode uses GitHub Models for superior rewriting quality.
"""
from __future__ import annotations

import logging
import re

logger = logging.getLogger(__name__)

# Approximate character limit per chunk
_CHUNK_CHAR_LIMIT = 3500


def humanize(text: str) -> dict:
    """Transform AI-generated text into natural, human-sounding writing."""
    try:
        result = _humanize_llm(text)
        result["model_used"] = "standard"
        return result
    except RuntimeError:
        result = _humanize_pipeline(text)
        result["model_used"] = "standard"
        return result


def humanize_premium(text: str, model: str = "Meta-Llama-3.1-405B-Instruct") -> dict:
    """Humanize using a premium GitHub Models model."""
    try:
        return _humanize_llm_premium(text, model)
    except RuntimeError:
        result = _humanize_llm(text)
        result["model_used"] = "standard"
        return result


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


_SYSTEM_PROMPT = (  # noqa: E501
    "You are a skilled ghostwriter. Rewrite AI-generated text so it reads "
    "as naturally human-written prose.\n\n"
    "RULES:\n"
    "1. Match the register and formality of the original. If the input is "
    "academic, keep it academic but less robotic. If it's casual, stay casual.\n"
    "2. Vary sentence length: mix short punchy sentences with longer flowing "
    "ones. Never start 3+ consecutive sentences the same way.\n"
    "3. Use everyday words and contractions (don't, it's, can't). Replace "
    "AI-signature words: delve -> explore/dig into, utilize -> use, "
    "facilitate -> help, commence -> start, comprehensive -> thorough, "
    "leverage -> use, robust -> strong, cutting-edge -> latest.\n"
    "4. Add subtle human touches: the occasional dash, an aside in "
    "parentheses, a rhetorical question, or a transition like 'Thing is,' "
    "or 'Now,' -- but don't overdo it.\n"
    "5. Vary paragraph length. Some short (1-2 sentences), some longer.\n"
    "6. Preserve ALL facts, arguments, and structure. Do NOT add new "
    "information or meta-commentary.\n"
    "7. Return ONLY the rewritten text. Keep roughly the same length "
    "(within 15%).\n\n"
    "EXAMPLE:\n"
    'Input: "Artificial intelligence has commenced a comprehensive '
    "transformation of the healthcare landscape, leveraging cutting-edge "
    'algorithms to facilitate more robust diagnostic capabilities."\n'
    'Output: "AI is reshaping healthcare in a big way. Modern algorithms '
    "are making diagnostics sharper and more reliable -- and we're really "
    'just getting started."'
)


def _humanize_llm(text: str) -> dict:
    from services.llm_client import llm_chat

    return _process_chunks(text, llm_chat)


def _humanize_llm_premium(text: str, model: str) -> dict:
    from services.llm_client import llm_chat_premium

    def _chat_fn(system_prompt, user_prompt, temperature, max_tokens):
        content, model_used = llm_chat_premium(
            system_prompt, user_prompt, model=model,
            temperature=temperature, max_tokens=max_tokens,
        )
        _chat_fn._model_used = model_used
        return content

    _chat_fn._model_used = "standard"
    result = _process_chunks(text, _chat_fn)
    result["model_used"] = _chat_fn._model_used
    return result


def _process_chunks(text: str, chat_fn) -> dict:
    """Shared logic for both free and premium humanization."""
    chunks = _split_into_chunks(text)

    if len(chunks) == 1:
        result = chat_fn(
            system_prompt=_SYSTEM_PROMPT,
            user_prompt=f"Rewrite this text to sound completely human-written:\n\n{chunks[0]}",
            temperature=0.75,
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
            temperature=0.75,
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
