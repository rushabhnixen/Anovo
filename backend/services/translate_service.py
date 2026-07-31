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


def translate(text: str, source_language: str, target_language: str) -> str:
    """Translate *text* from *source_language* to *target_language*."""
    try:
        return _translate_llm(text, source_language, target_language)
    except RuntimeError:
        return _translate_opus(text, source_language, target_language)


def _translate_llm(text: str, src: str, tgt: str) -> str:
    from services.llm_client import llm_chat

    src_name = LANG_NAMES.get(src, src)
    tgt_name = LANG_NAMES.get(tgt, tgt)

    return llm_chat(
        system_prompt=(
            "You are a professional translator. Translate accurately while preserving "
            "tone and nuance. Return ONLY the translated text — no explanations, "
            "no labels, no quotation marks."
        ),
        user_prompt=f"Translate the following from {src_name} to {tgt_name}:\n\n{text}",
        temperature=0.2,
        max_tokens=1024,
    )


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
