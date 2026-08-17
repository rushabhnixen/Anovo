"""
Translation service.

Uses LLM (Groq / HF Inference) when available; falls back to Helsinki-NLP OpusMT models.
"""
from __future__ import annotations

import re

# Map language codes to full names for better LLM prompts
LANG_NAMES: dict[str, str] = {
    "auto": "the automatically detected source language",
    "af": "Afrikaans", "am": "Amharic", "ar": "Arabic", "az": "Azerbaijani",
    "be": "Belarusian", "bg": "Bulgarian", "bn": "Bengali", "bs": "Bosnian",
    "ca": "Catalan", "cs": "Czech", "cy": "Welsh",
    "da": "Danish", "de": "German", "el": "Greek", "en": "English",
    "eo": "Esperanto", "es": "Spanish", "et": "Estonian", "eu": "Basque",
    "fa": "Persian", "fi": "Finnish", "fil": "Filipino", "fr": "French",
    "ga": "Irish", "gl": "Galician", "gu": "Gujarati", "he": "Hebrew",
    "hi": "Hindi", "hr": "Croatian", "hy": "Armenian",
    "hu": "Hungarian", "id": "Indonesian", "is": "Icelandic", "it": "Italian",
    "ja": "Japanese", "ka": "Georgian", "kk": "Kazakh", "km": "Khmer",
    "kn": "Kannada", "ko": "Korean", "lo": "Lao", "lt": "Lithuanian",
    "lv": "Latvian", "mk": "Macedonian", "ml": "Malayalam", "mn": "Mongolian",
    "mr": "Marathi", "ms": "Malay", "mt": "Maltese", "my": "Burmese",
    "nb": "Norwegian", "ne": "Nepali", "nl": "Dutch", "pa": "Punjabi",
    "pl": "Polish", "pt": "Portuguese", "ro": "Romanian",
    "ru": "Russian", "sk": "Slovak", "sl": "Slovenian", "sq": "Albanian",
    "sr": "Serbian", "sv": "Swedish", "sw": "Swahili", "ta": "Tamil",
    "te": "Telugu", "th": "Thai", "tr": "Turkish", "uk": "Ukrainian",
    "ur": "Urdu", "uz": "Uzbek", "vi": "Vietnamese", "yo": "Yoruba",
    "zh": "Chinese", "zu": "Zulu",
}


# Mixed-script input such as "Hello 😀 123 आज मौसम अच्छा है" left the digits in
# Western form while translating everything else, which reads as half-translated.
_NUMERAL_RULE = (
    "Render numbers using the numeral system native to the target language's "
    "script where one is conventionally used — for example Devanagari (१२३) for "
    "Hindi, Arabic-Indic (١٢٣) for Arabic, and Western digits (123) for English "
    "and most European languages. Leave emoji, URLs, e-mail addresses and code "
    "identifiers exactly as they are."
)


def translate(text: str, source_language: str, target_language: str) -> tuple[str, str | None]:
    """Translate *text* and report the source language actually used.

    Returns (translated_text, detected_language_code). The second value is None
    when detection was not possible, and echoes *source_language* when the
    caller specified one explicitly.

    Detection is deliberately a SEPARATE, best-effort call. An earlier version
    asked the model to return the translation and the detected language together
    as one JSON object; the model frequently ignored that contract and the user
    got an empty translation. Translation quality must never depend on the
    detection feature working.
    """
    try:
        translated = _translate_llm(text, source_language, target_language)
    except RuntimeError:
        return _translate_opus(text, source_language, target_language), None

    if base_language(source_language) != "auto":
        return translated, source_language
    return translated, _detect_language(text)


def base_language(language: str) -> str:
    """"en-US" -> "en"."""
    return (language or "").split("-")[0].strip().lower()


def _translate_llm(text: str, src: str, tgt: str) -> str:
    """Plain-text translation. One job, no structured-output contract."""
    from services.llm_client import llm_chat

    src_name = LANG_NAMES.get(src, src)
    tgt_name = LANG_NAMES.get(tgt, tgt)
    source_clause = (
        f"from {src_name} " if base_language(src) != "auto" else ""
    )

    raw = llm_chat(
        system_prompt=(
            "You are a professional translator. Translate accurately while preserving "
            f"tone and nuance. {_NUMERAL_RULE} "
            "Return ONLY the translated text — no explanations, no labels, no quotation marks."
        ),
        user_prompt=f"Translate the following {source_clause}to {tgt_name}:\n\n{text}",
        temperature=0.2,
        max_tokens=1024,
    )

    translated = raw.strip()
    if not translated:
        # Returning "" silently showed the user an empty result box. Fail loudly
        # so the caller can fall back instead.
        raise RuntimeError("The translation model returned an empty response")
    return translated


def _detect_language(text: str) -> str | None:
    """Best-effort source-language detection. Never raises."""
    from services.llm_client import llm_chat

    try:
        raw = llm_chat(
            system_prompt=(
                "You identify the language of text. Reply with ONLY the two-letter "
                "ISO 639-1 code (for example: en, fr, es, hi). No other text."
            ),
            user_prompt=f"What language is this?\n\n{text[:600]}",
            temperature=0.0,
            # GPT-OSS spends part of this budget on reasoning tokens before it
            # emits any visible text, so a tight cap returns an empty string.
            max_tokens=256,
        )
    except Exception:
        return None

    match = re.search(r"[A-Za-z]{2,3}", raw or "")
    if not match:
        return None
    code = match.group(0).lower()
    # Only report codes we can name, so the UI never shows a bare guess.
    return code if code in LANG_NAMES else None


# ── OpusMT fallback ─────────────────────────────────────────────────────────

def _translate_opus(text: str, src: str, tgt: str) -> str:  # pragma: no cover
    from functools import lru_cache
    from transformers import MarianMTModel, MarianTokenizer

    @lru_cache(maxsize=32)
    def _load(model_name: str):
        tok = MarianTokenizer.from_pretrained(model_name)
        mod = MarianMTModel.from_pretrained(model_name)
        return tok, mod

    model_name = f"Helsinki-NLP/opus-mt-{src}-{tgt}"
    try:
        tokenizer, model = _load(model_name)
    except OSError:
        raise ValueError(
            f"Translation model not available for {src} → {tgt}. Tried: {model_name}"
        )
    batch = tokenizer([text], return_tensors="pt", padding=True, truncation=True, max_length=512)
    ids = model.generate(**batch, num_beams=4, early_stopping=True)
    return tokenizer.decode(ids[0], skip_special_tokens=True)
