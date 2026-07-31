"""Quality regressions for Co-Writer response parsing."""

import pytest

from services.cowriter_service import _parse_suggestions


def test_parse_suggestions_prefers_json_and_deduplicates():
    raw = '```json\n["A clear next step.", "A different direction.", "A clear next step."]\n```'
    assert _parse_suggestions(raw, "Existing draft.", 3) == [
        "A clear next step.",
        "A different direction.",
    ]


def test_parse_suggestions_supports_numbered_fallback():
    raw = "1. First continuation.\n2) Second continuation.\n- Third continuation."
    assert _parse_suggestions(raw, "Existing draft.", 3) == [
        "First continuation.",
        "Second continuation.",
        "Third continuation.",
    ]


def test_parse_suggestions_rejects_empty_output():
    with pytest.raises(RuntimeError, match="no usable suggestions"):
        _parse_suggestions("[]", "Existing draft.", 3)
