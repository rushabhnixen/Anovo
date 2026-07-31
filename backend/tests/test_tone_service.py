"""Regression tests for robust tone-score parsing and fallback."""

from unittest.mock import patch

from services.tone_service import TONE_LABELS, _parse_scores, detect_tone


def test_parse_scores_accepts_fenced_json_and_percentages():
    scores = _parse_scores(
        '```json\n{"formal":"82%","casual":0.1,"persuasive":0.6,'
        '"informative":0.7,"humorous":0.05,"sarcastic":0.02,'
        '"optimistic":0.3,"pessimistic":0.1}\n```'
    )
    assert scores["formal"] == 0.82
    assert scores["informative"] == 0.7


def test_invalid_llm_response_uses_distinct_fast_fallback():
    with patch("services.llm_client.llm_chat", return_value="not json"):
        result = detect_tone("We must act now because the report shows a critical problem.")

    scores = [tone["score"] for tone in result["tones"]]
    assert len(result["tones"]) == len(TONE_LABELS)
    assert len(set(scores)) > 1
    assert result["primary_tone"] in TONE_LABELS


def test_equal_llm_scores_do_not_surface_as_all_fifty_percent():
    equal_scores = {label: 0.5 for label in TONE_LABELS}
    with patch("services.llm_client.llm_chat", return_value=__import__("json").dumps(equal_scores)):
        result = detect_tone("This report explains the results and recommends immediate action.")

    assert len({tone["score"] for tone in result["tones"]}) > 1
