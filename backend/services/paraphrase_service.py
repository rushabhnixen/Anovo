"""
Paraphrase service.

Uses Groq API (llama-3.3-70b) when GROQ_API_KEY is set — fast, high quality.
Falls back to local T5 model otherwise.
"""
from __future__ import annotations

import httpx

from config import settings

INTENSITY_PROMPTS: dict[int, str] = {
    1: (
        "Paraphrase the following text with minimal changes — only replace a few words "
        "with synonyms while keeping the same sentence structure and length."
    ),
    2: (
        "Paraphrase the following text with light rewording — adjust phrasing slightly "
        "but keep the original structure mostly intact."
    ),
    3: (
        "Paraphrase the following text naturally — rewrite it clearly while fully "
        "preserving the original meaning. Vary the sentence structure moderately."
    ),
    4: (
        "Paraphrase the following text with strong rewording — significantly restructure "
        "the sentences and use different vocabulary while keeping the exact same meaning."
    ),
    5: (
        "Paraphrase the following text creatively — completely reimagine how the idea is "
        "expressed using a fresh style, different sentence structures, and varied vocabulary. "
        "The meaning must remain identical but the wording should be as different as possible."
    ),
}


def paraphrase(text: str, intensity: int = 3) -> str:
    """Return a paraphrased version of *text* at the given intensity (1–5)."""
    if settings.groq_api_key:
        return _paraphrase_groq(text, intensity)
    return _paraphrase_t5(text, intensity)


def _paraphrase_groq(text: str, intensity: int) -> str:
    """Use Groq LLM for high-quality paraphrasing."""
    instruction = INTENSITY_PROMPTS.get(intensity, INTENSITY_PROMPTS[3])
    prompt = f"{instruction}\n\nText to paraphrase:\n{text}\n\nParaphrased version:"

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.groq_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.groq_model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a professional writing assistant specialised in paraphrasing. "
                    "Return ONLY the paraphrased text — no explanations, no labels, "
                    "no quotation marks, no preamble."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.4 + (intensity - 1) * 0.15,  # 0.4 → 1.0 across intensities
        "max_tokens": 1024,
    }

    try:
        response = httpx.post(url, json=payload, headers=headers, timeout=30.0)
        response.raise_for_status()
    except httpx.HTTPStatusError as e:
        raise RuntimeError(f"Groq API error {e.response.status_code}: {e.response.text}")
    except httpx.ConnectError:
        raise RuntimeError("Cannot connect to Groq API.")

    return response.json()["choices"][0]["message"]["content"].strip()


# ── T5 fallback (used only when Groq is not configured) ──────────────────────

INTENSITY_PARAMS: dict[int, dict] = {
    1: {"temperature": 0.5, "num_beams": 2, "top_k": 50},
    2: {"temperature": 0.7, "num_beams": 4, "top_k": 100},
    3: {"temperature": 1.0, "num_beams": 5, "top_k": 120},
    4: {"temperature": 1.3, "num_beams": 8, "top_k": 150},
    5: {"temperature": 1.6, "num_beams": 10, "top_k": 200},
}


def _load_t5():  # pragma: no cover
    from functools import lru_cache
    from transformers import T5ForConditionalGeneration, T5Tokenizer

    @lru_cache(maxsize=1)
    def _cached():
        tokenizer = T5Tokenizer.from_pretrained(settings.paraphrase_model)
        model = T5ForConditionalGeneration.from_pretrained(settings.paraphrase_model)
        return tokenizer, model

    return _cached()


def _paraphrase_t5(text: str, intensity: int) -> str:  # pragma: no cover
    tokenizer, model = _load_t5()
    params = INTENSITY_PARAMS.get(intensity, INTENSITY_PARAMS[3])
    input_text = f"paraphrase: {text} </s>"
    encoding = tokenizer.encode_plus(
        input_text,
        padding="max_length",
        max_length=256,
        truncation=True,
        return_tensors="pt",
    )
    output_ids = model.generate(
        input_ids=encoding["input_ids"],
        attention_mask=encoding["attention_mask"],
        max_length=256,
        early_stopping=True,
        num_beams=params["num_beams"],
        num_return_sequences=1,
        no_repeat_ngram_size=2,
        temperature=params["temperature"],
        top_k=params["top_k"],
        do_sample=(params["temperature"] > 1.0),
    )
    return tokenizer.decode(output_ids[0], skip_special_tokens=True)
