from pydantic import BaseModel, Field
from typing import Literal, Optional


# ── Paraphrase ──────────────────────────────────────────────────────────────

class ParaphraseRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=50000, description="Text to paraphrase")
    intensity: int = Field(3, ge=1, le=5, description="Paraphrase intensity (1=minimal, 5=aggressive)")
    model: str = Field("standard", description="Model to use: 'standard' or a supported Anovo model profile")
    writing_mode: Literal[
        "standard", "fluency", "formal", "simple", "creative",
        "academic", "expand", "shorten", "humanize",
    ] = Field("standard", description="Writing style for the paraphrase")


class ParaphraseResponse(BaseModel):
    original: str
    paraphrased: str
    intensity: int
    model_used: str = "standard"
    writing_mode: str = "standard"


class ParaphraseRefineRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=50000, description="Full paraphrased text for context")
    selected_text: str = Field(..., min_length=1, max_length=2000, description="Selected sentence or word")
    kind: Literal["sentence", "word"]
    writing_mode: Literal[
        "standard", "fluency", "formal", "simple", "creative",
        "academic", "expand", "shorten", "humanize",
    ] = "standard"
    intensity: int = Field(3, ge=1, le=5)
    count: int = Field(5, ge=2, le=8)


class ParaphraseRefineResponse(BaseModel):
    selected_text: str
    kind: str
    suggestions: list[str]


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
    text: str = Field(..., min_length=1, max_length=50000, description="Text to humanize")
    model: str = Field("standard", description="Model to use: 'standard' or a supported Anovo model profile")


class HumanizeResponse(BaseModel):
    original: str
    humanized: str
    steps: Optional[dict] = None
    model_used: str = "standard"


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
    text: str = Field(..., min_length=1, max_length=10000, description="Draft text and context")
    max_tokens: int = Field(50, ge=10, le=200, description="Maximum tokens to generate")
    num_suggestions: int = Field(3, ge=1, le=5, description="Number of suggestions to return")
    action: Literal[
        "continue", "next_paragraph", "expand", "transition", "outline",
    ] = Field("continue", description="What the co-writer should produce next")
    tone: Literal[
        "match", "professional", "friendly", "academic", "persuasive", "creative",
    ] = Field("match", description="Voice for the suggestions")
    model: str = Field("standard", description="Anovo writing model profile")


class CoWriterResponse(BaseModel):
    prompt: str
    suggestions: list[str]
    action: str = "continue"
    tone: str = "match"
    model_used: str = "standard"


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
    is_premium: bool = False
    is_admin: bool = False

    model_config = {"from_attributes": True}


class PromoCodeRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=64, description="Promo code to redeem")


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


# ── Admin ───────────────────────────────────────────────────────────────────

class AdminUserUpdate(BaseModel):
    is_premium: Optional[bool] = None
    is_admin: Optional[bool] = None


class AdminStatsResponse(BaseModel):
    total_users: int
    premium_users: int
    admin_users: int
    total_history_entries: int


class AdminModelInfo(BaseModel):
    id: str
    label: str
    provider_model: str
    status: Literal["production", "preview"]


class AdminModelsResponse(BaseModel):
    provider: str
    provider_configured: bool
    standard_model: str
    models: list[AdminModelInfo]
