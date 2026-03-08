"""
Shared HuggingFace Inference API client.

Mirrors groq_client.py — same function signature, different provider.
Uses the OpenAI-compatible router endpoint at router.huggingface.co.
"""
from __future__ import annotations

import httpx

from config import settings

HF_URL = "https://router.huggingface.co/v1/chat/completions"


def hf_chat(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.7,
    max_tokens: int = 1024,
) -> str:
    """Send a chat completion request to HF Inference API and return the content."""
    headers = {
        "Authorization": f"Bearer {settings.hf_api_token}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.hf_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    try:
        resp = httpx.post(HF_URL, json=payload, headers=headers, timeout=60.0)
        resp.raise_for_status()
    except httpx.ConnectError:
        raise RuntimeError("Cannot connect to HuggingFace Inference API.")
    except httpx.HTTPStatusError as e:
        raise RuntimeError(
            f"HF Inference API error {e.response.status_code}: {e.response.text}"
        )

    return resp.json()["choices"][0]["message"]["content"].strip()
