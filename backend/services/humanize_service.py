"""
AI Text Humanizer service.

Uses LLM (Groq / HF Inference) for high-quality humanization when available.
Falls back to a multi-step local pipeline (paraphrase + back-translate +
burstiness + heuristics) otherwise.
"""
from __future__ import annotations

from config import settings


def humanize(text: str) -> dict:
    """Transform AI-generated text into natural, human-sounding writing."""
    try:
        return _humanize_llm(text)
    except RuntimeError:
        return _humanize_pipeline(text)


def _humanize_llm(text: str) -> dict:
    from services.llm_client import llm_chat

    result = llm_chat(
        system_prompt=(
            "You are an expert at rewriting AI-generated text so it reads as if a "
            "real person wrote it naturally. Apply ALL of these techniques:\n"
            "1. Use contractions (don't, it's, we're) instead of formal forms.\n"
            "2. Vary sentence lengths — mix short punchy sentences with longer ones.\n"
            "3. Add occasional discourse markers (honestly, look, basically, I mean).\n"
            "4. Use active voice over passive voice.\n"
            "5. Replace jargon and overly formal vocabulary with everyday words.\n"
            "6. Add subtle imperfections — the occasional dash, parenthetical aside, "
            "or rhetorical question that real humans use.\n"
            "7. Avoid patterns that flag AI detectors: no repetitive sentence starters, "
            "no overly balanced paragraph structures, no generic filler phrases.\n\n"
            "Return ONLY the rewritten text. No explanations, no labels."
        ),
        user_prompt=f"Rewrite this AI-generated text to sound completely human:\n\n{text}",
        temperature=0.8,
        max_tokens=1024,
    )

    return {"humanized": result, "steps": None}


# ── Local pipeline fallback ──────────────────────────────────────────────────

def _humanize_pipeline(text: str) -> dict:  # pragma: no cover
    import random
    import re
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
