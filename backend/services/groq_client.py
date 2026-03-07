"""
Shared Groq API client used by all LLM-powered services.
"""
from __future__ import annotations

import httpx

from config import settings

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


def groq_chat(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.7,
    max_tokens: int = 1024,
) -> str:
    """Send a chat completion request to Groq and return the content."""
    headers = {
        "Authorization": f"Bearer {settings.groq_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.groq_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    try:
        resp = httpx.post(GROQ_URL, json=payload, headers=headers, timeout=30.0)
        resp.raise_for_status()
    except httpx.ConnectError:
        raise RuntimeError("Cannot connect to Groq API.")
    except httpx.HTTPStatusError as e:
        raise RuntimeError(f"Groq API error {e.response.status_code}: {e.response.text}")

    return resp.json()["choices"][0]["message"]["content"].strip()
