"""
Translation service.

Uses LLM (Groq / HF Inference) when available; falls back to Helsinki-NLP OpusMT models.
"""
from __future__ import annotations

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
    """
    try:
        return _translate_llm(text, source_language, target_language)
    except RuntimeError:
        return _translate_opus(text, source_language, target_language), None


def _translate_llm(text: str, src: str, tgt: str) -> tuple[str, str | None]:
    import json
    import re

    from services.llm_client import llm_chat

    src_name = LANG_NAMES.get(src, src)
    tgt_name = LANG_NAMES.get(tgt, tgt)
    detecting = src == "auto"

    if detecting:
        # Ask for the detected language in the same call, so auto-detect can be
        # surfaced in the UI instead of being invisible to the user.
        system_prompt = (
            "You are a professional translator. Translate accurately while preserving "
            f"tone and nuance. {_NUMERAL_RULE}\n"
            'Return ONLY a JSON object: {"detected_language": "<ISO 639-1 code>", '
            '"translation": "<the translated text>"}\n'
            "No markdown, no commentary."
        )
        user_prompt = f"Detect the language of the following text and translate it to {tgt_name}:\n\n{text}"
    else:
        system_prompt = (
            "You are a professional translator. Translate accurately while preserving "
            f"tone and nuance. {_NUMERAL_RULE} "
            "Return ONLY the translated text — no explanations, no labels, no quotation marks."
        )
        user_prompt = f"Translate the following from {src_name} to {tgt_name}:\n\n{text}"

    raw = llm_chat(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        temperature=0.2,
        max_tokens=1024,
    )

    if not detecting:
        return raw.strip(), src

    cleaned = re.sub(r"```(?:json)?\s*", "", raw, flags=re.IGNORECASE).replace("```", "").strip()
    match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
    if match:
        try:
            payload = json.loads(match.group(0))
            translation = str(payload.get("translation") or "").strip()
            detected = str(payload.get("detected_language") or "").strip().lower() or None
            if translation:
                # Only report codes we can name, so the UI never shows a guess.
                return translation, (detected if detected in LANG_NAMES else None)
        except json.JSONDecodeError:
            pass

    # The model ignored the JSON contract; the text is still usable.
    return cleaned, None


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
