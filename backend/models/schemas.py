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


# ── Plagiarism Checker ───────────────────────────────────────────────────────

class PlagiarismRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000, description="Text to check")
    reference_text: str = Field(..., min_length=1, max_length=5000, description="Reference text to compare against")


class PlagiarismResponse(BaseModel):
    text: str
    reference_text: str
    similarity_score: float = Field(description="Cosine similarity between 0 and 1")
    is_plagiarized: bool = Field(description="True if similarity exceeds threshold")
    threshold: float


# ── Tone Detector ────────────────────────────────────────────────────────────

class ToneScore(BaseModel):
    label: str
    score: float


class ToneRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000, description="Text to analyze")


class ToneResponse(BaseModel):
    text: str
    tones: list[ToneScore]
    primary_tone: str


# ── Co-Writer ────────────────────────────────────────────────────────────────

class CoWriterRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000, description="Text prompt for autocomplete")
    max_tokens: int = Field(50, ge=10, le=200, description="Maximum tokens to generate")
    num_suggestions: int = Field(3, ge=1, le=5, description="Number of suggestions to return")


class CoWriterResponse(BaseModel):
    prompt: str
    suggestions: list[str]


# ── AI Chat ──────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="User message")
    mode: str = Field("general", description="Chat mode: 'general', 'creative', or 'academic'")
    history: list[ChatMessage] = Field(default_factory=list, description="Conversation history")


class ChatResponse(BaseModel):
    reply: str
    mode: str


# ── Auth ─────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=64, description="Unique username")
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=8, description="Password (min 8 characters)")


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    username: str
    email: str

    model_config = {"from_attributes": True}


# ── History ───────────────────────────────────────────────────────────────────

class SaveHistoryRequest(BaseModel):
    tool: str = Field(..., description="Tool name (e.g. 'paraphrase', 'summarize')")
    input_text: str = Field(..., min_length=1)
    output_text: str = Field(..., min_length=1)


class HistoryEntryResponse(BaseModel):
    id: int
    tool: str
    input_text: str
    output_text: str
    created_at: str

    model_config = {"from_attributes": True}
