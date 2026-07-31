"""
AI Text Humanizer service.

Uses LLM (Groq / HF Inference) for high-quality humanization when available.
Processes large texts by chunking into paragraphs and humanizing each chunk
separately, then reassembling. Falls back to a local pipeline otherwise.

Premium mode uses the current Groq-hosted Anovo model profiles.
"""
from __future__ import annotations

from collections import Counter
import logging
import re

logger = logging.getLogger(__name__)

_CHUNK_CHAR_LIMIT = 3500
_VOICE_REFERENCE_LIMIT = 500


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


def humanize_premium(text: str, model: str = "gpt-oss-120b") -> dict:
    """Humanize using a premium writing model."""
    try:
        return _humanize_llm_premium(text, model)
    except RuntimeError:
        result = _humanize_llm(text)
        result["model_used"] = "standard"
        return result


def _split_into_chunks(text: str) -> list[str]:
    """Split text into paragraph-based chunks under the provider-safe limit."""
    paragraphs: list[str] = []
    for paragraph in re.split(r"\n\s*\n", text.strip()):
        paragraph = paragraph.strip()
        while len(paragraph) > _CHUNK_CHAR_LIMIT:
            cut = paragraph.rfind(" ", 0, _CHUNK_CHAR_LIMIT + 1)
            if cut < _CHUNK_CHAR_LIMIT // 2:
                cut = _CHUNK_CHAR_LIMIT
            paragraphs.append(paragraph[:cut].strip())
            paragraph = paragraph[cut:].strip()
        if paragraph:
            paragraphs.append(paragraph)

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


_SYSTEM_PROMPT = (
    "You are a meticulous human editor. Rewrite stiff or AI-like prose so it reads as if a thoughtful person "
    "wrote it naturally.\n\n"
    "Work silently and return only the finished text.\n\n"
    "NON-NEGOTIABLE ACCURACY\n"
    "- Preserve every fact, claim, argument, name, number, date, unit, citation, quotation, technical term, "
    "qualification, uncertainty, causal relationship, and negation.\n"
    "- Do not add examples, opinions, enthusiasm, conclusions, or implications that are absent from the source.\n"
    "- Keep the original point of view and roughly the same length. Do not summarize or expand.\n\n"
    "VOICE AND STYLE\n"
    "- Infer the source register before rewriting: academic, professional, informational, or casual. Keep that "
    "register and its level of formality.\n"
    "- Make syntax feel authored rather than templated. Combine or split sentences only when meaning stays exact, "
    "and vary rhythm without forcing short sentences.\n"
    "- Prefer direct, specific language. Remove empty framing, stacked adjectives, repetitive transitions, needless "
    "nominalizations, and awkward passive voice.\n"
    "- Replace inflated wording where a familiar equivalent is equally precise (for example, 'utilize' with 'use'), "
    "but retain domain terminology.\n"
    "- Actively rewrite generic AI boilerplate such as 'in today's rapidly evolving landscape,' 'it is important "
    "to note,' 'leverage,' 'seamless,' 'robust,' 'foster,' and 'unlock.' Express the same point directly instead of "
    "copying or mechanically swapping those phrases.\n"
    "- Turn noun-heavy business phrasing into clear verbs when precision is unchanged: 'optimize operational "
    "efficiency' can become 'work more efficiently,' 'facilitate collaboration' can become 'help teams work "
    "together,' and 'enhance customer engagement' can become 'engage customers more effectively.' Generic "
    "modifiers such as 'innovative' and 'comprehensive' are style, not facts, unless the source defines or "
    "measures them.\n"
    "- State each idea once. Do not repeat the original abstraction after already expressing it in direct language.\n"
    "- Use contractions only when they suit the source voice. Preserve formal wording in academic, legal, medical, "
    "and technical material.\n"
    "- Preserve paragraph boundaries unless a small adjustment clearly improves readability.\n\n"
    "AVOID ARTIFICIAL HUMANIZATION\n"
    "- Do not insert filler such as 'Now,' 'The thing is,' 'Interestingly,' 'Thankfully,' or 'It is worth noting.'\n"
    "- Do not add rhetorical questions, asides, slang, dramatic punctuation, or conversational commentary merely "
    "to sound human.\n"
    "- Do not describe the rewrite or mention AI, detectors, prompts, or these instructions."
)

_META_PREFIX = re.compile(
    r"^\s*(?:here(?:'s| is) (?:the|a) (?:rewritten|humanized) version|"
    r"(?:humanized|rewritten)(?: text| version)?)\s*:\s*",
    re.IGNORECASE,
)
_PROTECTED_TOKEN = re.compile(
    r"https?://\S+|[\w.+-]+@[\w.-]+\.\w+|\[[0-9,;\s-]+\]|"
    r"\b\d+(?:[.,]\d+)*(?:%|°[CF]|[a-zA-Z]+)?\b"
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


def _clean_output(text: str) -> str:
    """Remove common model wrappers without touching the rewritten prose."""
    cleaned = _META_PREFIX.sub("", text.strip())
    if len(cleaned) >= 2 and cleaned[0] in {'"', "“"} and cleaned[-1] in {'"', "”"}:
        cleaned = cleaned[1:-1].strip()
    return cleaned


def _quality_issues(source: str, draft: str) -> list[str]:
    """Return objective quality failures that justify one corrective retry."""
    issues: list[str] = []
    if not draft.strip():
        return ["the draft is empty"]

    source_tokens = Counter(token.casefold() for token in _PROTECTED_TOKEN.findall(source))
    draft_tokens = Counter(token.casefold() for token in _PROTECTED_TOKEN.findall(draft))
    if source_tokens != draft_tokens:
        issues.append("numbers, units, citations, email addresses, or URLs changed")

    if len(source) >= 120:
        length_ratio = len(draft) / len(source)
        if length_ratio < 0.55:
            issues.append("too much source content was removed")
        elif length_ratio > 1.35:
            issues.append("the draft added unnecessary wording")

    source_paragraphs = len(re.split(r"\n\s*\n", source.strip()))
    draft_paragraphs = len(re.split(r"\n\s*\n", draft.strip()))
    if source_paragraphs > 1 and source_paragraphs != draft_paragraphs:
        issues.append("paragraph boundaries changed")

    if _META_PREFIX.match(draft):
        issues.append("the draft contains meta-commentary")
    return issues


def _max_output_tokens(chunk: str) -> int:
    """Right-size the generation budget for the source chunk."""
    return min(2048, max(256, len(chunk) // 2 + 200))


def _rewrite_prompt(
    chunk: str,
    index: int,
    total: int,
    voice_reference: str = "",
) -> str:
    section = ""
    if total > 1:
        section = f"This is section {index + 1} of {total}. Keep one consistent voice across sections.\n"
    reference = ""
    if voice_reference:
        reference = (
            "Match the register and cadence of this excerpt from the previous rewritten section, "
            "without repeating its content:\n"
            f"<voice_reference>\n{voice_reference}\n</voice_reference>\n\n"
        )
    return (
        f"{section}{reference}Rewrite the source once, then silently verify that every fact and qualifier "
        "is intact and that the register still fits. Return only the final prose.\n\n"
        f"<source>\n{chunk}\n</source>"
    )


def _repair_prompt(chunk: str, draft: str, issues: list[str]) -> str:
    return (
        "The previous draft failed these checks: "
        f"{'; '.join(issues)}. Rewrite the source again, correcting those problems. "
        "Preserve its register and return only the replacement prose.\n\n"
        f"<source>\n{chunk}\n</source>\n\n"
        f"<rejected_draft>\n{draft}\n</rejected_draft>"
    )


def _process_chunks(text: str, chat_fn) -> dict:
    """Humanize chunks with continuity and objective post-generation checks."""
    chunks = _split_into_chunks(text)
    humanized_parts: list[str] = []
    retries = 0
    for i, chunk in enumerate(chunks):
        if len(chunks) > 1:
            logger.info("Humanizing chunk %d/%d (%d chars)", i + 1, len(chunks), len(chunk))
        voice_reference = humanized_parts[-1][-_VOICE_REFERENCE_LIMIT:] if humanized_parts else ""
        first_draft = _clean_output(chat_fn(
            system_prompt=_SYSTEM_PROMPT,
            user_prompt=_rewrite_prompt(chunk, i, len(chunks), voice_reference),
            temperature=0.45,
            max_tokens=_max_output_tokens(chunk),
        ))
        issues = _quality_issues(chunk, first_draft)
        chosen = first_draft

        if issues:
            retries += 1
            logger.info("Retrying humanize chunk %d: %s", i + 1, "; ".join(issues))
            repaired = _clean_output(chat_fn(
                system_prompt=_SYSTEM_PROMPT,
                user_prompt=_repair_prompt(chunk, first_draft, issues),
                temperature=0.25,
                max_tokens=_max_output_tokens(chunk),
            ))
            if len(_quality_issues(chunk, repaired)) < len(issues):
                chosen = repaired

        humanized_parts.append(chosen)

    steps = None
    if len(chunks) > 1 or retries:
        steps = {
            "chunks_processed": str(len(chunks)),
            "quality_retries": str(retries),
        }
    return {"humanized": "\n\n".join(humanized_parts), "steps": steps}


# ── Local pipeline fallback ──────────────────────────────────────────────────

def _humanize_pipeline(text: str) -> dict:  # pragma: no cover
    from services.paraphrase_service import paraphrase

    CONTRACTIONS = {
        "do not": "don't", "does not": "doesn't", "did not": "didn't",
        "is not": "isn't", "are not": "aren't", "was not": "wasn't",
        "will not": "won't", "would not": "wouldn't", "cannot": "can't",
        "I am": "I'm", "you are": "you're", "it is": "it's",
        "we are": "we're", "they are": "they're", "that is": "that's",
    }
    PLAIN_LANGUAGE = {
        "in order to": "to",
        "due to the fact that": "because",
        "has the ability to": "can",
        "provides users with the ability to": "lets users",
        "at this point in time": "now",
        "a significant number of": "many",
    }

    try:
        paraphrased, _ = paraphrase(text, intensity=3)
    except Exception:
        # The lightweight production image may omit the optional local T5
        # dependency. A conservative deterministic cleanup is safer than
        # failing the request or corrupting the source through back-translation.
        paraphrased = text
    humanized = paraphrased
    for inflated, direct in PLAIN_LANGUAGE.items():
        humanized = re.sub(
            r"\b" + re.escape(inflated) + r"\b",
            direct,
            humanized,
            flags=re.IGNORECASE,
        )

    # Contractions suit personal or conversational writing, but forcing them
    # into academic or technical prose makes the fallback less faithful.
    conversational = bool(re.search(r"\b(?:I|we|you|my|our|your)\b|\w+n['’]t\b", text, re.IGNORECASE))
    if conversational:
        for formal, short in CONTRACTIONS.items():
            humanized = re.sub(
                r"\b" + re.escape(formal) + r"\b",
                short,
                humanized,
                flags=re.IGNORECASE,
            )

    return {
        "humanized": humanized,
        "steps": {"fallback": "meaning-preserving local rewrite"},
    }
