"""
Unified LLM client with graceful fallback: Groq (multi-key) -> HF Inference API.

Every LLM-powered service should call llm_chat() instead of groq_chat()
directly.  If all remote providers fail, a RuntimeError is raised and the
caller is responsible for falling back to local models.

Groq key rotation: set GROQ_API_KEYS=key1,key2,key3,key4 (comma-separated).
Each request picks the next key round-robin so rate limits are spread evenly.
If a key fails, the next key is tried before moving to HF fallback.
"""
from __future__ import annotations

import itertools
import logging
import threading

import httpx

from config import settings

logger = logging.getLogger(__name__)

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
HF_URL = "https://router.huggingface.co/v1/chat/completions"
GITHUB_MODELS_URL = "https://models.inference.ai.azure.com/chat/completions"

GITHUB_MODELS_AVAILABLE = [
    "Meta-Llama-3.1-405B-Instruct",
    "gpt-4o",
    "Mistral-large-2407",
    "Meta-Llama-3.1-70B-Instruct",
]


class ProviderError(Exception):
    """A single provider failed; the cascade should try the next one."""


def _build_groq_keys() -> list[str]:
    """Collect all configured Groq keys, deduped, preserving order."""
    keys: list[str] = []
    if settings.groq_api_keys:
        keys.extend(k.strip() for k in settings.groq_api_keys.split(",") if k.strip())
    if settings.groq_api_key and settings.groq_api_key not in keys:
        keys.append(settings.groq_api_key)
    return keys


_groq_keys = _build_groq_keys()
_groq_cycle = itertools.cycle(_groq_keys) if _groq_keys else None
_groq_lock = threading.Lock()


def llm_chat(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.7,
    max_tokens: int = 1024,
) -> str:
    """Simple API matching groq_chat() signature.  Used by 7 services."""
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]
    return llm_chat_messages(messages, temperature=temperature, max_tokens=max_tokens)


def llm_chat_messages(
    messages: list[dict[str, str]],
    temperature: float = 0.7,
    max_tokens: int = 1024,
) -> str:
    """Full messages API.  Used by chat_service.py (which builds history)."""
    errors: list[str] = []

    # 1. Try Groq keys (round-robin, try all before giving up)
    if _groq_keys:
        with _groq_lock:
            start_key = next(_groq_cycle)  # type: ignore[arg-type]
        keys_to_try = _rotate_from(start_key)
        for i, key in enumerate(keys_to_try):
            try:
                return _call_provider(
                    url=GROQ_URL,
                    api_key=key,
                    model=settings.groq_model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    timeout=30.0,
                )
            except ProviderError as e:
                masked = f"{key[:8]}...{key[-4:]}"
                logger.warning(
                    "Groq key %d/%d (%s) failed: %s",
                    i + 1, len(keys_to_try), masked, e,
                )
                errors.append(f"Groq[{masked}]: {e}")

    # 2. Try HuggingFace Inference API
    if settings.hf_api_token:
        try:
            return _call_provider(
                url=HF_URL,
                api_key=settings.hf_api_token,
                model=settings.hf_model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=60.0,
            )
        except ProviderError as e:
            logger.warning("HF Inference failed (%s), no more providers.", e)
            errors.append(f"HF: {e}")

    # 3. Nothing worked — let the caller fall back to local models
    detail = (
        "; ".join(errors)
        if errors
        else "No LLM provider configured (set GROQ_API_KEYS or HF_API_TOKEN)"
    )
    raise RuntimeError(f"All LLM providers failed. {detail}")


def _rotate_from(start_key: str) -> list[str]:
    """Return all Groq keys starting from start_key (for trying all on failure)."""
    try:
        idx = _groq_keys.index(start_key)
    except ValueError:
        return list(_groq_keys)
    return _groq_keys[idx:] + _groq_keys[:idx]


def llm_chat_premium(
    system_prompt: str,
    user_prompt: str,
    model: str = "Meta-Llama-3.1-405B-Instruct",
    temperature: float = 0.7,
    max_tokens: int = 4096,
) -> tuple[str, str]:
    """Call a premium model via GitHub Models API.

    Returns (content, model_used).  Falls back to the standard Groq/HF cascade
    if GitHub PAT is not configured or if the call fails.
    """
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    pat = settings.github_pat
    if pat:
        logger.info(
            "Attempting GitHub Models: model=%s, PAT prefix=%s..., url=%s",
            model, pat[:10], GITHUB_MODELS_URL,
        )
        try:
            content = _call_provider(
                url=GITHUB_MODELS_URL,
                api_key=pat,
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=90.0,
            )
            logger.info("GitHub Models (%s) succeeded.", model)
            return content, model
        except ProviderError as e:
            logger.error("GitHub Models (%s) FAILED: %s — falling back to standard.", model, e)
    else:
        logger.warning("GITHUB_PAT not set — skipping premium, using standard cascade.")

    # Fallback: use the standard Groq -> HF cascade
    content = llm_chat_messages(messages, temperature=temperature, max_tokens=max_tokens)
    return content, "standard"


def _call_provider(
    *,
    url: str,
    api_key: str,
    model: str,
    messages: list[dict[str, str]],
    temperature: float,
    max_tokens: int,
    timeout: float,
) -> str:
    """Call any OpenAI-compatible chat completions endpoint."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    try:
        resp = httpx.post(url, json=payload, headers=headers, timeout=timeout)
        resp.raise_for_status()
    except httpx.ConnectError as exc:
        raise ProviderError(f"connection failed: {exc}") from exc
    except httpx.TimeoutException as exc:
        raise ProviderError(f"request timed out after {timeout}s") from exc
    except httpx.HTTPStatusError as exc:
        code = exc.response.status_code
        text = exc.response.text[:300]
        raise ProviderError(f"HTTP {code}: {text}") from exc

    try:
        return resp.json()["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, TypeError) as exc:
        raise ProviderError(f"unexpected response format: {exc}") from exc
