"""Tests for the current writing-model registry and legacy migrations."""

from unittest.mock import Mock, patch

import pytest

from services.llm_client import _call_provider, resolve_premium_model


@pytest.mark.parametrize(
    ("selector", "expected"),
    [
        ("gpt-oss-120b", "openai/gpt-oss-120b"),
        ("gpt-oss-20b", "openai/gpt-oss-20b"),
        ("compound", "groq/compound"),
        ("compound-mini", "groq/compound-mini"),
        ("qwen-3.6-27b", "qwen/qwen3.6-27b"),
        ("gpt-4o", "openai/gpt-oss-120b"),
        ("gpt-4o-mini", "openai/gpt-oss-20b"),
        ("Meta-Llama-3.1-405B-Instruct", "openai/gpt-oss-120b"),
    ],
)
def test_resolve_premium_model(selector, expected):
    assert resolve_premium_model(selector) == expected


def test_resolve_premium_model_rejects_arbitrary_provider_ids():
    with pytest.raises(ValueError, match="Unsupported writing model"):
        resolve_premium_model("unknown/provider-model")


def test_gpt_oss_requests_low_reasoning_for_fast_writing():
    response = Mock()
    response.raise_for_status.return_value = None
    response.json.return_value = {"choices": [{"message": {"content": "Ready"}}]}

    with patch("services.llm_client.httpx.post", return_value=response) as post:
        result = _call_provider(
            url="https://provider.test/chat",
            api_key="secret",
            model="openai/gpt-oss-20b",
            messages=[{"role": "user", "content": "Continue this draft"}],
            temperature=0.7,
            max_tokens=1024,
            timeout=30.0,
        )

    assert result == "Ready"
    assert post.call_args.kwargs["json"]["reasoning_effort"] == "low"
