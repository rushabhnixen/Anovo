"""
AI Text Humanizer service.

Pipeline:
  1. Paraphrase (T5)
  2. Back-translation  EN → FR → EN
  3. Burstiness modulation (vary sentence lengths)
  4. Human heuristics injection (contractions, discourse markers)
"""
from __future__ import annotations

import random
import re

from services.paraphrase_service import paraphrase
from services.translate_service import translate

# ── Contraction map ──────────────────────────────────────────────────────────
CONTRACTIONS: dict[str, str] = {
    "do not": "don't",
    "does not": "doesn't",
    "did not": "didn't",
    "is not": "isn't",
    "are not": "aren't",
    "was not": "wasn't",
    "were not": "weren't",
    "will not": "won't",
    "would not": "wouldn't",
    "could not": "couldn't",
    "should not": "shouldn't",
    "cannot": "can't",
    "have not": "haven't",
    "has not": "hasn't",
    "had not": "hadn't",
    "I am": "I'm",
    "you are": "you're",
    "he is": "he's",
    "she is": "she's",
    "it is": "it's",
    "we are": "we're",
    "they are": "they're",
    "I have": "I've",
    "you have": "you've",
    "we have": "we've",
    "they have": "they've",
    "I will": "I'll",
    "you will": "you'll",
    "he will": "he'll",
    "she will": "she'll",
    "we will": "we'll",
    "they will": "they'll",
    "I would": "I'd",
    "that is": "that's",
    "there is": "there's",
    "what is": "what's",
    "here is": "here's",
}

DISCOURSE_MARKERS = [
    "Honestly, ",
    "Basically, ",
    "To be fair, ",
    "Look, ",
    "You know, ",
    "I mean, ",
    "Actually, ",
    "Frankly, ",
]


def _apply_contractions(text: str) -> str:
    for formal, contraction in CONTRACTIONS.items():
        text = re.sub(r"\b" + re.escape(formal) + r"\b", contraction, text, flags=re.IGNORECASE)
    return text


def _modulate_burstiness(text: str) -> str:
    """Randomly split long sentences and merge short consecutive ones."""
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    result: list[str] = []
    i = 0
    while i < len(sentences):
        s = sentences[i]
        words = s.split()
        # Split long sentences (>25 words) at a comma if possible
        if len(words) > 25 and "," in s:
            parts = s.split(",", 1)
            result.append(parts[0].strip() + ".")
            result.append(parts[1].strip().capitalize())
        # Merge consecutive short sentences (<6 words)
        elif len(words) < 6 and i + 1 < len(sentences) and len(sentences[i + 1].split()) < 6:
            merged = s.rstrip(".!?") + ", " + sentences[i + 1][0].lower() + sentences[i + 1][1:]
            result.append(merged)
            i += 2
            continue
        else:
            result.append(s)
        i += 1
    return " ".join(result)


def _inject_discourse(text: str) -> str:
    """Randomly prepend a discourse marker to one sentence."""
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    if not sentences:
        return text
    idx = random.randint(0, len(sentences) - 1)
    marker = random.choice(DISCOURSE_MARKERS)
    sentences[idx] = marker + sentences[idx][0].lower() + sentences[idx][1:]
    return " ".join(sentences)


def humanize(text: str) -> dict:
    """Run the full humanization pipeline and return intermediate steps."""
    # Step 1 – Paraphrase
    paraphrased = paraphrase(text, intensity=3)

    # Step 2 – Back-translation EN → FR → EN
    try:
        french = translate(paraphrased, "en", "fr")
        back_translated = translate(french, "fr", "en")
    except Exception:
        back_translated = paraphrased

    # Step 3 – Burstiness modulation
    bursty = _modulate_burstiness(back_translated)

    # Step 4 – Human heuristics
    humanized = _inject_discourse(_apply_contractions(bursty))

    return {
        "humanized": humanized,
        "steps": {
            "paraphrased": paraphrased,
            "back_translated": back_translated,
            "bursty": bursty,
        },
    }
