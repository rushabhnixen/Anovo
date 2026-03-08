"""
AI Text Humanizer service.

Uses LLM (Groq / HF Inference) for high-quality humanization when available.
Processes large texts by chunking into paragraphs and humanizing each chunk
separately, then reassembling. Falls back to a local pipeline otherwise.
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


_SYSTEM_PROMPT = """You are a world-class ghostwriter who specializes in making AI-generated text completely undetectable. Your job is to rewrite text so it reads as if a thoughtful, educated human wrote it naturally — not a language model.

Follow these rules STRICTLY:

SENTENCE STRUCTURE:
- Vary sentence length dramatically. Mix very short sentences (3-6 words) with medium and occasionally long ones.
- Start sentences differently — never begin 3+ consecutive sentences with the same word or pattern.
- Use fragments occasionally. Like this. It's natural.
- Avoid the classic AI pattern of "Topic sentence → 3 supporting sentences → concluding sentence" in every paragraph.

WORD CHOICE:
- Replace formal/academic vocabulary with everyday equivalents (utilize → use, demonstrate → show, facilitate → help, commence → start, individual → person).
- Use contractions liberally (don't, it's, we're, can't, wouldn't, they've).
- Drop unnecessary hedging words AI loves: "It is important to note that", "It is worth mentioning", "In terms of", "It should be noted".
- Avoid AI-signature phrases: "delve", "crucial", "landscape", "comprehensive", "robust", "leverage", "cutting-edge", "game-changer", "dive in", "not only...but also", "In today's world", "In conclusion".

HUMAN VOICE:
- Write with mild opinions and personality — humans have viewpoints.
- Add occasional asides, parentheticals, or dashes for emphasis — like real people do.
- Use rhetorical questions sparingly but effectively.
- Include the occasional informal transition: "Thing is,", "Here's the deal:", "So basically,", "Now,", "And honestly,".

PARAGRAPH STRUCTURE:
- Vary paragraph lengths. Some can be 1-2 sentences. Others might be 4-5.
- Don't follow a rigid template. Let the writing breathe.
- Avoid overly smooth transitions between every single paragraph — sometimes humans just jump to the next point.

CRITICAL RULES:
- Preserve all factual content and key arguments. Do NOT add new information.
- Do NOT add any meta-commentary, labels, or explanations.
- Return ONLY the rewritten text — nothing else.
- The output must be roughly the same length as the input (within 15%)."""


def _humanize_llm(text: str) -> dict:
    from services.llm_client import llm_chat

    chunks = _split_into_chunks(text)

    if len(chunks) == 1:
        result = llm_chat(
            system_prompt=_SYSTEM_PROMPT,
            user_prompt=f"Rewrite this text to sound completely human-written:\n\n{chunks[0]}",
            temperature=0.85,
            max_tokens=4096,
        )
        return {"humanized": result, "steps": None}

    # Process multiple chunks
    humanized_parts: list[str] = []
    for i, chunk in enumerate(chunks):
        logger.info("Humanizing chunk %d/%d (%d chars)", i + 1, len(chunks), len(chunk))
        part = llm_chat(
            system_prompt=_SYSTEM_PROMPT,
            user_prompt=(
                f"Rewrite this text to sound completely human-written. "
                f"This is section {i + 1} of {len(chunks)} — maintain a consistent "
                f"voice throughout:\n\n{chunk}"
            ),
            temperature=0.85,
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
