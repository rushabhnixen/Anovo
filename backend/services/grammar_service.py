"""
Grammar checking service using LanguageTool REST API.

Defaults to the free public languagetool.org API.
Override LANGUAGETOOL_URL to point to a self-hosted instance.
"""
from __future__ import annotations

import httpx

from config import settings
from models.schemas import GrammarError


def check_grammar(text: str, language: str = "en-US") -> list[GrammarError]:
    """Send *text* to LanguageTool and return a list of errors."""
    url = f"{settings.languagetool_url}/v2/check"
    payload = {"text": text, "language": language}

    try:
        response = httpx.post(url, data=payload, timeout=15.0)
        response.raise_for_status()
    except httpx.ConnectError:
        raise RuntimeError(
            "Cannot connect to LanguageTool at: " + settings.languagetool_url
        )

    data = response.json()
    errors: list[GrammarError] = []

    for match in data.get("matches", []):
        errors.append(
            GrammarError(
                message=match["message"],
                offset=match["offset"],
                length=match["length"],
                replacements=[r["value"] for r in match.get("replacements", [])[:5]],
                rule_id=match["rule"]["id"],
                category=match["rule"]["category"]["id"],
            )
        )

    return errors
