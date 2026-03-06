"""
Paraphrase service using T5 (Vamsi/T5_Paraphrase_Paws).
Models are loaded lazily on first request.
"""
from __future__ import annotations

from functools import lru_cache

from transformers import T5ForConditionalGeneration, T5Tokenizer

from config import settings

# Intensity → generation hyperparameters mapping
INTENSITY_PARAMS: dict[int, dict] = {
    1: {"temperature": 0.5, "num_beams": 2, "top_k": 50},
    2: {"temperature": 0.7, "num_beams": 4, "top_k": 100},
    3: {"temperature": 1.0, "num_beams": 5, "top_k": 120},
    4: {"temperature": 1.3, "num_beams": 8, "top_k": 150},
    5: {"temperature": 1.6, "num_beams": 10, "top_k": 200},
}


@lru_cache(maxsize=1)
def _load_model() -> tuple[T5Tokenizer, T5ForConditionalGeneration]:
    tokenizer = T5Tokenizer.from_pretrained(settings.paraphrase_model)
    model = T5ForConditionalGeneration.from_pretrained(settings.paraphrase_model)
    return tokenizer, model


def paraphrase(text: str, intensity: int = 3) -> str:
    """Return a paraphrased version of *text* at the given intensity (1–5)."""
    tokenizer, model = _load_model()
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
