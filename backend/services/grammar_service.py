"""
Grammar checking service.

Primary engine is LanguageTool (defaults to the free public languagetool.org
API; override LANGUAGETOOL_URL for a self-hosted instance). LanguageTool has no
language pack for Hindi and many other languages, so those are routed through
the LLM cascade instead of silently reporting zero errors.
"""
from __future__ import annotations

import json
import logging
import re

import httpx

from config import settings
from models.schemas import GrammarError

logger = logging.getLogger(__name__)

# Base language codes LanguageTool ships packs for. Anything outside this set
# would come back with zero matches, which reads to the user as "no mistakes".
LT_SUPPORTED_LANGUAGES = frozenset({
    "ar", "ast", "be", "br", "ca", "da", "de", "el", "en", "eo", "es", "fa",
    "fr", "ga", "gl", "it", "ja", "km", "nl", "pl", "pt", "ro", "ru", "sk",
    "sl", "sv", "ta", "tl", "uk", "zh",
})


# Script ranges are enough to pick an engine — we only need to know whether
# LanguageTool has a pack, not the exact dialect.
_SCRIPT_LANGUAGES = (
    (r"[ऀ-ॿ]", "hi"),      # Devanagari
    (r"[؀-ۿ]", "ar"),      # Arabic
    (r"[ঀ-৿]", "bn"),      # Bengali
    (r"[਀-੿]", "pa"),      # Gurmukhi
    (r"[઀-૿]", "gu"),      # Gujarati
    (r"[஀-௿]", "ta"),      # Tamil
    (r"[ఀ-౿]", "te"),      # Telugu
    (r"[฀-๿]", "th"),      # Thai
    (r"[Ѐ-ӿ]", "ru"),      # Cyrillic
    (r"[֐-׿]", "he"),      # Hebrew
    (r"[぀-ヿ]", "ja"),      # Kana
    (r"[一-鿿]", "zh"),      # Han
    (r"[가-힯]", "ko"),      # Hangul
)

DEFAULT_LANGUAGE = "en-US"


def base_language(language: str) -> str:
    """"en-US" -> "en"."""
    return (language or "").split("-")[0].strip().lower()


def detect_language(text: str) -> str:
    """Best-effort language code from the dominant script; Latin falls back to English."""
    for pattern, code in _SCRIPT_LANGUAGES:
        if re.search(pattern, text):
            return code
    return DEFAULT_LANGUAGE


def resolve_language(text: str, language: str) -> str:
    """Turn "auto" (the workspace default) into a concrete language code."""
    if language and base_language(language) != "auto":
        return language
    return detect_language(text)


def is_language_supported(language: str) -> bool:
    return base_language(language) in LT_SUPPORTED_LANGUAGES


def check_grammar(text: str, language: str = DEFAULT_LANGUAGE) -> list[GrammarError]:
    """Return grammar errors for *text*, choosing an engine by language."""
    resolved = resolve_language(text, language)
    if not is_language_supported(resolved):
        return _check_llm(text, resolved)
    return _check_languagetool(text, resolved)


def _check_languagetool(text: str, language: str) -> list[GrammarError]:
    url = f"{settings.languagetool_url}/v2/check"
    payload = {
        "text": text,
        "language": language,
        # Default mode leaves style, redundancy and conjunction rules switched
        # off, which is why "Although he was tired but ..." and missing
        # end-of-sentence punctuation went unreported.
        "level": "picky",
    }

    try:
        response = httpx.post(url, data=payload, timeout=15.0)
        response.raise_for_status()
    except httpx.ConnectError:
        raise RuntimeError(
            "Cannot connect to LanguageTool at: " + settings.languagetool_url
        )

    data = response.json()
    errors: list[GrammarError] = []

    for match in data.get("matches", []):
        errors.append(
            GrammarError(
                message=match["message"],
                offset=match["offset"],
                length=match["length"],
                replacements=[r["value"] for r in match.get("replacements", [])[:5]],
                rule_id=match["rule"]["id"],
                category=match["rule"]["category"]["id"],
            )
        )

    return errors


# ── LLM engine for languages LanguageTool cannot check ───────────────────────

def _check_llm(text: str, language: str) -> list[GrammarError]:
    """Grammar check via the LLM cascade, for languages such as Hindi.

    The model is asked for the exact substring it objects to; offsets are then
    computed locally with str.find, because models cannot count characters
    reliably and a wrong offset would highlight the wrong words.
    """
    from services.llm_client import llm_chat

    try:
        raw = llm_chat(
            system_prompt=(
                "You are a meticulous grammar checker. Find grammar, spelling, "
                "agreement, tense and punctuation mistakes in the user's text.\n"
                "Reply with ONLY a JSON array. Each element must be an object with:\n"
                '  "fragment"   - the exact substring from the text that is wrong, copied verbatim\n'
                '  "message"    - a short explanation, written in the same language as the text\n'
                '  "correction" - the corrected replacement for that fragment\n'
                "Report every real mistake and nothing else. If the text is correct, reply [].\n"
                "Do not translate the text. Do not add commentary or markdown."
            ),
            user_prompt=f"Check this text:\n\n{text}",
            temperature=0.0,
            max_tokens=1024,
        )
    except RuntimeError:
        # No provider available; report nothing rather than inventing errors.
        logger.warning("LLM grammar check unavailable for language %r", language)
        return []

    return _parse_llm_errors(raw, text)


def _parse_llm_errors(raw: str, text: str) -> list[GrammarError]:
    cleaned = re.sub(r"```(?:json)?\s*", "", raw, flags=re.IGNORECASE).replace("```", "").strip()
    array_match = re.search(r"\[.*\]", cleaned, flags=re.DOTALL)
    if not array_match:
        return []

    try:
        items = json.loads(array_match.group(0))
    except json.JSONDecodeError:
        return []
    if not isinstance(items, list):
        return []

    errors: list[GrammarError] = []
    search_from = 0
    for item in items:
        if not isinstance(item, dict):
            continue
        fragment = str(item.get("fragment") or "").strip()
        message = str(item.get("message") or "").strip()
        correction = str(item.get("correction") or "").strip()
        if not fragment or not message:
            continue

        # Locate the fragment, preferring the first match at or after the
        # previous one so repeated words map to successive positions.
        offset = text.find(fragment, search_from)
        if offset == -1:
            offset = text.find(fragment)
        if offset == -1:
            # The model paraphrased instead of quoting; drop it rather than
            # highlighting an arbitrary span.
            continue
        search_from = offset + len(fragment)

        errors.append(
            GrammarError(
                message=message,
                offset=offset,
                length=len(fragment),
                replacements=[correction] if correction and correction != fragment else [],
                rule_id="LLM_GRAMMAR",
                category="GRAMMAR",
            )
        )

    return errors
