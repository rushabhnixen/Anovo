from pydantic import BaseModel, Field
from typing import Optional


# ── Paraphrase ──────────────────────────────────────────────────────────────

class ParaphraseRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000, description="Text to paraphrase")
    intensity: int = Field(3, ge=1, le=5, description="Paraphrase intensity (1=minimal, 5=aggressive)")


class ParaphraseResponse(BaseModel):
    original: str
    paraphrased: str
    intensity: int


# ── Grammar ─────────────────────────────────────────────────────────────────

class GrammarError(BaseModel):
    message: str
    offset: int
    length: int
    replacements: list[str]
    rule_id: str
    category: str


class GrammarRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000, description="Text to check")
    language: str = Field("en-US", description="Language code (e.g. en-US, de-DE)")


class GrammarResponse(BaseModel):
    original: str
    errors: list[GrammarError]
    error_count: int


# ── Summarize ────────────────────────────────────────────────────────────────

class SummarizeRequest(BaseModel):
    text: str = Field(..., min_length=50, max_length=5000, description="Text to summarize")
    mode: str = Field("paragraph", description="Summary mode: 'paragraph' or 'bullet'")
    max_length: int = Field(150, ge=30, le=500, description="Maximum summary length in tokens")


class SummarizeResponse(BaseModel):
    original: str
    summary: str
    mode: str


# ── Translate ────────────────────────────────────────────────────────────────

class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000, description="Text to translate")
    source_language: str = Field("en", description="Source language code")
    target_language: str = Field("fr", description="Target language code")


class TranslateResponse(BaseModel):
    original: str
    translated: str
    source_language: str
    target_language: str


# ── Humanize ─────────────────────────────────────────────────────────────────

class HumanizeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000, description="Text to humanize")


class HumanizeResponse(BaseModel):
    original: str
    humanized: str
    steps: Optional[dict] = None
