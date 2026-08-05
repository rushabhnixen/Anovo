"""
AI Chat service.

Uses LLM cascade (Groq / HF Inference) when available.
Falls back to a self-hosted Ollama instance otherwise.
"""
from __future__ import annotations

import httpx

from config import settings

# Models are poor at counting while generating, so ask for an explicit check
# rather than hoping. This reduces, but cannot eliminate, count drift.
_LENGTH_DISCIPLINE = (
    "If the user asks for an exact number of words, sentences, bullet points or "
    "items, treat it as a hard requirement: draft the answer, count, and adjust "
    "until it matches before replying. Never pad to reach a count."
)

# Answers must end cleanly rather than stopping mid-sentence at the token cap.
_COMPLETENESS = (
    "Always finish your final sentence. If the topic is too large to cover fully, "
    "narrow the scope and say what you left out instead of stopping mid-thought."
)

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

# The previous call relied on llm_chat_messages' 1024-token default. Academic
# mode routinely needs more than that, and GPT-OSS spends part of the budget on
# reasoning tokens, so detailed answers were cut off mid-sentence.
CHAT_MAX_TOKENS = 4096


def chat(message: str, mode: str = "general", history: list[dict] | None = None) -> str:
    """Send a chat request and return the assistant reply."""
    base_prompt = MODE_SYSTEM_PROMPTS.get(mode, MODE_SYSTEM_PROMPTS["general"])
    system_prompt = f"{base_prompt} {_LENGTH_DISCIPLINE} {_COMPLETENESS}"
    messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]
    for h in (history or []):
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": message})

    try:
        from services.llm_client import llm_chat_messages
        return llm_chat_messages(messages, max_tokens=CHAT_MAX_TOKENS)
    except RuntimeError:
        return _chat_ollama(messages)


def _chat_ollama(messages: list[dict[str, str]]) -> str:
    """Call a self-hosted Ollama instance."""
    url = f"{settings.ollama_url}/api/chat"
    payload = {"model": settings.ollama_model, "messages": messages, "stream": False}

    try:
        response = httpx.post(url, json=payload, timeout=60.0)
        response.raise_for_status()
    except httpx.ConnectError:
        raise RuntimeError(
            "Chat is unavailable. Set GROQ_API_KEY or HF_API_TOKEN for AI chat, "
            "or run Ollama at: " + settings.ollama_url
        )

    return response.json().get("message", {}).get("content", "")
