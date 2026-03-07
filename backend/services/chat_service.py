"""
AI Chat service.

Uses Groq API (free tier) when GROQ_API_KEY is set in config.
Falls back to a self-hosted Ollama instance otherwise.
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
    """Send a chat request and return the assistant reply."""
    system_prompt = MODE_SYSTEM_PROMPTS.get(mode, MODE_SYSTEM_PROMPTS["general"])
    messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]
    for h in (history or []):
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": message})

    if settings.groq_api_key:
        return _chat_groq(messages)
    return _chat_ollama(messages)


def _chat_groq(messages: list[dict[str, str]]) -> str:
    """Call the Groq API (OpenAI-compatible, free tier)."""
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.groq_api_key}",
        "Content-Type": "application/json",
    }
    payload = {"model": settings.groq_model, "messages": messages}

    try:
        response = httpx.post(url, json=payload, headers=headers, timeout=60.0)
        response.raise_for_status()
    except httpx.ConnectError:
        raise RuntimeError("Cannot connect to Groq API. Check your GROQ_API_KEY.")
    except httpx.HTTPStatusError as e:
        raise RuntimeError(f"Groq API error {e.response.status_code}: {e.response.text}")

    return response.json()["choices"][0]["message"]["content"]


def _chat_ollama(messages: list[dict[str, str]]) -> str:
    """Call a self-hosted Ollama instance."""
    url = f"{settings.ollama_url}/api/chat"
    payload = {"model": settings.ollama_model, "messages": messages, "stream": False}

    try:
        response = httpx.post(url, json=payload, timeout=60.0)
        response.raise_for_status()
    except httpx.ConnectError:
        raise RuntimeError(
            "Chat is unavailable. Set GROQ_API_KEY for free AI chat, "
            "or run Ollama at: " + settings.ollama_url
        )

    return response.json().get("message", {}).get("content", "")
