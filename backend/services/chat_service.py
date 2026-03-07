"""
AI Chat service using Ollama REST API (Llama 3 / Mistral 7B).

When Ollama is not available the service raises a RuntimeError so
the router can return an appropriate HTTP status.
"""
from __future__ import annotations

import httpx

from config import settings

MODE_SYSTEM_PROMPTS: dict[str, str] = {
    "general": "You are a helpful, friendly AI assistant.",
    "creative": (
        "You are a creative writing assistant. "
        "Be imaginative, use vivid language, and help the user brainstorm ideas."
    ),
    "academic": (
        "You are an academic writing assistant. "
        "Use formal language, cite reasoning, and be precise."
    ),
}


def chat(message: str, mode: str = "general", history: list[dict] | None = None) -> str:
    """Send a chat request to the Ollama API and return the reply."""
    system_prompt = MODE_SYSTEM_PROMPTS.get(mode, MODE_SYSTEM_PROMPTS["general"])

    messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]
    for h in (history or []):
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": message})

    url = f"{settings.ollama_url}/api/chat"
    payload = {
        "model": settings.ollama_model,
        "messages": messages,
        "stream": False,
    }

    try:
        response = httpx.post(url, json=payload, timeout=60.0)
        response.raise_for_status()
    except httpx.ConnectError:
        raise RuntimeError(
            "Cannot connect to Ollama. "
            "Make sure it is running at: " + settings.ollama_url
        )

    data = response.json()
    return data.get("message", {}).get("content", "")
