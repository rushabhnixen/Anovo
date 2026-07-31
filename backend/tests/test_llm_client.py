"""Tests for the current writing-model registry and legacy migrations."""

import pytest

from services.llm_client import resolve_premium_model


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
