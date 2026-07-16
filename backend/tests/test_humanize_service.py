from services.humanize_service import (
    _CHUNK_CHAR_LIMIT,
    _humanize_pipeline,
    _process_chunks,
    _quality_issues,
    _split_into_chunks,
)


def test_long_single_paragraph_is_split_within_limit():
    text = " ".join(["Natural writing still needs to preserve meaning."] * 220)

    chunks = _split_into_chunks(text)

    assert len(chunks) > 1
    assert all(len(chunk) <= _CHUNK_CHAR_LIMIT for chunk in chunks)
    assert "".join(chunks).replace(" ", "") == text.replace(" ", "")


def test_quality_checks_protect_numbers_and_length():
    source = (
        "The trial included 248 adults and lasted 12 weeks. "
        "Blood pressure fell by 14.2%, compared with 4.1% in the control group."
    )

    issues = _quality_issues(source, "The trial included 250 adults and produced better results.")

    assert any("numbers" in issue for issue in issues)
    assert any("removed" in issue for issue in issues)


def test_process_chunks_retries_an_objectively_invalid_draft():
    source = (
        "The trial included 248 adults between 18 and 65 years of age. "
        "After 12 weeks, systolic blood pressure fell by 14.2%, compared with 4.1% "
        "in the control group. No serious adverse events were reported."
    )
    responses = iter(
        [
            "The trial included 250 adults and showed a dramatic improvement.",
            (
                "The trial enrolled 248 adults aged 18 to 65. After 12 weeks, systolic "
                "blood pressure fell by 14.2%, versus 4.1% in the control group. "
                "No serious adverse events were reported."
            ),
        ]
    )
    calls = []

    def fake_chat(**kwargs):
        calls.append(kwargs)
        return next(responses)

    result = _process_chunks(source, fake_chat)

    assert len(calls) == 2
    assert calls[0]["temperature"] == 0.45
    assert calls[1]["temperature"] == 0.25
    assert "248 adults" in result["humanized"]
    assert "250 adults" not in result["humanized"]
    assert result["steps"]["quality_retries"] == "1"


def test_process_chunks_keeps_a_valid_draft_without_retry():
    source = "The team implemented a scheduling system to make meeting coordination more efficient."

    def fake_chat(**_kwargs):
        return "The team introduced a scheduling system to coordinate meetings more efficiently."

    result = _process_chunks(source, fake_chat)

    assert result["humanized"].startswith("The team introduced")
    assert result["steps"] is None


def test_local_fallback_remains_available_without_optional_model(monkeypatch):
    def unavailable_paraphraser(*_args, **_kwargs):
        raise ModuleNotFoundError("transformers")

    monkeypatch.setattr("services.paraphrase_service.paraphrase", unavailable_paraphraser)
    source = "The system provides users with the ability to organize meetings."

    result = _humanize_pipeline(source)

    assert result["humanized"] == "The system lets users organize meetings."
    assert result["steps"]["fallback"] == "meaning-preserving local rewrite"
