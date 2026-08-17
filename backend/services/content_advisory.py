"""
Input-quality advisories.

Several tools assume natural-language prose. When they are handed JSON, source
code, digits or emoji they still return a confident answer — a tone score for
"123456789", grammar "corrections" that would break a Python file, or a
co-writer paragraph invented from `{"name":"John"}`.

This module classifies such input so callers can attach a caution to the
response. It never blocks the request: the tool still runs and returns its
normal result, the user is just told the result may not mean much.
"""
from __future__ import annotations

import json
import re

# Structural giveaways for the common languages people paste in.
_CODE_PATTERNS = (
    r"\bdef\s+\w+\s*\(",                    # Python
    r"\bfunction\s+\w+\s*\(",               # JavaScript
    r"\b(?:const|let|var)\s+\w+\s*=",       # JavaScript
    r"=>\s*[{(]",                           # arrow functions
    r"\bclass\s+\w+\s*[:({]",               # Python / Java / JS
    r"\bimport\s+[\w.{}\s,*]+from\b",       # ES modules
    r"^\s*(?:import|from)\s+[\w.]+",        # Python imports
    r"^\s*#include\b",                      # C / C++
    r"\b(?:public|private|protected)\s+(?:static\s+)?\w+\s+\w+\s*\(",  # Java / C#
    r"\bconsole\.log\s*\(",
    r"\bprint\s*\(",
    r"</\w+>",                              # closing HTML/XML tag
    r"<\w+[^>]*>.*</\w+>",                  # an HTML element
    r"^\s*[\w.]+\s*=\s*.+;\s*$",            # assignment ending in a semicolon
)

# Covers the main pictographic blocks plus dingbats and regional indicators.
_EMOJI_RE = re.compile(
    "[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F1E6-\U0001F1FF"
    "\U00002190-\U000021FF\U00002B00-\U00002BFF\U0000FE00-\U0000FE0F\U0000200D]"
)

JSON_ADVISORY = (
    "This looks like JSON. Anovo treats it as prose, so the result may "
    "restructure or invent values rather than preserve your data."
)
CODE_ADVISORY = (
    "This looks like source code. Anovo analyses it as prose, so any "
    "suggestions may be wrong and should not be applied to your code."
)
EMOJI_ADVISORY = (
    "This input is mostly emoji. There are no words to analyse, so the result "
    "is unlikely to be meaningful."
)
NO_PROSE_ADVISORY = (
    "This input has no words in it. There is nothing to analyse, so the result "
    "is unlikely to be meaningful."
)
VERY_SHORT_ADVISORY = (
    "This input is very short. Results are usually better with at least a full "
    "sentence or two."
)


def _looks_like_json(text: str) -> bool:
    candidate = text.strip()
    if not candidate or candidate[0] not in "{[":
        return False
    try:
        return isinstance(json.loads(candidate), (dict, list))
    except ValueError:
        return False


def _looks_like_code(text: str) -> bool:
    return any(
        re.search(pattern, text, flags=re.MULTILINE)
        for pattern in _CODE_PATTERNS
    )


def _has_letters(text: str) -> bool:
    # \w minus digits and underscore == letters in any script, so this stays
    # true for Hindi, Arabic, Chinese and so on.
    return bool(re.search(r"[^\W\d_]", text))


def _is_mostly_emoji(text: str) -> bool:
    stripped = _EMOJI_RE.sub("", text).strip()
    return bool(_EMOJI_RE.search(text)) and not stripped


def classify(text: str) -> str | None:
    """Return the input kind: 'json', 'code', 'emoji', 'no_prose', or None."""
    if not text or not text.strip():
        return None
    if _looks_like_json(text):
        return "json"
    if _looks_like_code(text):
        return "code"
    if _is_mostly_emoji(text):
        return "emoji"
    if not _has_letters(text):
        return "no_prose"
    return None


# Refusal messages. Deliberately more directive than the advisories: these are
# returned instead of a result, so they must say what to do next.
_REFUSALS = {
    "json": (
        "This looks like structured JSON data, not prose. Anovo would have to "
        "treat it as sentences, which produces a meaningless result and can "
        "alter your values. Paste the text you want analysed instead."
    ),
    "code": (
        "This looks like source code, not prose. Anovo would suggest changes "
        "that break it. Use a linter or formatter for code."
    ),
    "emoji": (
        "This input is only emoji, so there is nothing to analyse. Add some "
        "text and try again."
    ),
    "no_prose": (
        "This input contains no words, so there is nothing to analyse. Add "
        "some text and try again."
    ),
}

# Input a tool cannot say anything true about.
NO_ANALYSABLE_TEXT = ("emoji", "no_prose")
# Input that is text, but not prose.
STRUCTURED_INPUT = ("json", "code")


def refusal(text: str, kinds: tuple[str, ...]) -> str | None:
    """Message explaining why *text* cannot be processed, or None to proceed.

    Used by tools whose output is a verdict (tone, plagiarism) or generated
    content (co-writer). A confident wrong answer is worse than a clear refusal,
    so those tools decline rather than attach a caution. Tools whose output is a
    transformation the user can judge for themselves keep using `advise`.
    """
    kind = classify(text)
    if kind in kinds:
        return _REFUSALS[kind]
    return None


def advise(text: str, *, min_words: int = 0) -> str | None:
    """Return a caution message for *text*, or None when it looks like prose.

    Checks run most-specific first so JSON is not merely reported as "code".
    Set *min_words* to also flag input that is too short for the caller's tool.
    """
    if not text or not text.strip():
        return None

    if _looks_like_json(text):
        return JSON_ADVISORY
    if _looks_like_code(text):
        return CODE_ADVISORY
    if _is_mostly_emoji(text):
        return EMOJI_ADVISORY
    if not _has_letters(text):
        return NO_PROSE_ADVISORY
    if min_words and len(re.findall(r"[^\W\d_]+", text)) < min_words:
        return VERY_SHORT_ADVISORY

    return None
