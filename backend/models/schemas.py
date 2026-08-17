import re

from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Literal, Optional


ADVISORY_FIELD = Field(
    None,
    description="Caution shown when the input does not look like prose (JSON, code, digits, emoji)",
)


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
    advisory: Optional[str] = ADVISORY_FIELD


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
    advisory: Optional[str] = ADVISORY_FIELD
    language_supported: bool = True
    checked_language: str = "en-US"


# ── Summarize ────────────────────────────────────────────────────────────────

class SummarizeRequest(BaseModel):
    text: str = Field(..., min_length=50, max_length=5000, description="Text to summarize")
    mode: str = Field("paragraph", description="Summary mode: 'paragraph' or 'bullet'")
    max_length: int = Field(150, ge=30, le=500, description="Maximum summary length in tokens")


class SummarizeResponse(BaseModel):
    original: str
    summary: str
    mode: str
    advisory: Optional[str] = ADVISORY_FIELD


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
    # Populated when source_language is "auto", so the UI can show what was
    # detected instead of leaving the user guessing.
    detected_language: Optional[str] = None
    detected_language_name: Optional[str] = None


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
    # 50k matches the paraphraser. QA pasted a 5000-word document (~30k
    # characters) and hit a 422; long documents are the point of the tool.
    text: str = Field(..., min_length=1, max_length=50000, description="Text to check")
    reference_text: str = Field(..., min_length=1, max_length=50000, description="Reference text to compare against")


class PlagiarismResponse(BaseModel):
    text: str
    reference_text: str
    similarity_score: float = Field(description="Cosine similarity between 0 and 1")
    is_plagiarized: bool = Field(description="True if similarity exceeds threshold")
    threshold: float
    advisory: Optional[str] = ADVISORY_FIELD
    compared_chunks: int = 1


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
    advisory: Optional[str] = ADVISORY_FIELD


# ── Co-Writer ────────────────────────────────────────────────────────────────

class CoWriterRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000, description="Draft text and context")
    # Separate from `text` on purpose. The draft is untrusted content that must
    # never redirect the model (BUG-043); instructions typed here are the
    # author's own directives and ARE obeyed (BUG-045).
    instructions: str = Field(
        "",
        max_length=500,
        description="Optional directives for the co-writer, e.g. what to avoid",
    )
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
    advisory: Optional[str] = ADVISORY_FIELD


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

# Letters, digits, dot, underscore and hyphen; must start and end alphanumeric.
# Rejects "@@@", emoji, brackets and spaces.
_USERNAME_RE = re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$")

# bcrypt silently truncates anything past 72 bytes, so reject it up front rather
# than hashing a password the user cannot reliably reproduce. Emoji cost 4 bytes
# each, so this is well short of 128 characters for some inputs.
_BCRYPT_MAX_BYTES = 72

PASSWORD_RULE = (
    "Password must be at least 8 characters, include at least one letter and "
    "one number, and contain no spaces or emoji."
)

# QA follow-up on BUG-007: "abc123 \U0001f600" satisfied letter+digit and was
# accepted. Whitespace inside a password is a common typo source and emoji are
# unreliable to re-enter across keyboards, so both are rejected outright.
_ALLOWED_PASSWORD_CHARS = re.compile(
    r"^[A-Za-z0-9!\"#$%&'()*+,\-./:;<=>?@\[\\\]^_`{|}~]+$"
)
USERNAME_RULE = (
    "Username must be 3-32 characters, contain at least one letter, and use "
    "only letters, numbers, dots, underscores or hyphens."
)


def validate_username(value: str) -> str:
    """Shared username rule. Raises ValueError with a user-facing message."""
    candidate = value.strip()
    if not _USERNAME_RE.match(candidate):
        raise ValueError(USERNAME_RULE)
    if not any(char.isalpha() for char in candidate):
        # Rejects all-numeric usernames such as "123".
        raise ValueError(USERNAME_RULE)
    return candidate


def validate_password(value: str) -> str:
    """Shared password rule. Raises ValueError with a user-facing message."""
    if not value.strip():
        # Rejects passwords made entirely of whitespace.
        raise ValueError(PASSWORD_RULE)
    if not _ALLOWED_PASSWORD_CHARS.match(value):
        # Catches spaces, tabs, emoji and other non-typeable characters even
        # when a letter and a digit are also present.
        raise ValueError(PASSWORD_RULE)
    if not any(char.isalpha() for char in value):
        raise ValueError(PASSWORD_RULE)
    if not any(char.isdigit() for char in value):
        raise ValueError(PASSWORD_RULE)
    if len(value.encode("utf-8")) > _BCRYPT_MAX_BYTES:
        raise ValueError(
            f"Password is too long (max {_BCRYPT_MAX_BYTES} bytes). "
            "Emoji and accented characters count as more than one byte."
        )
    return value


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=32, description=USERNAME_RULE)
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, max_length=128, description=PASSWORD_RULE)

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, value: str) -> str:
        # EmailStr lowercases the domain but not the local part, which would let
        # "User@x.com" and "user@x.com" register as two separate accounts.
        return value.strip().lower()

    @field_validator("username")
    @classmethod
    def _check_username(cls, value: str) -> str:
        return validate_username(value)

    @field_validator("password")
    @classmethod
    def _check_password(cls, value: str) -> str:
        return validate_password(value)


class LoginRequest(BaseModel):
    # Deliberately NOT EmailStr and no strength rules: accounts created before
    # these rules were tightened must still be able to sign in.
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., description="Email address to send a reset link to")

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=1, max_length=256, description="Reset token from the email link")
    password: str = Field(..., min_length=8, max_length=128, description=PASSWORD_RULE)

    @field_validator("password")
    @classmethod
    def _check_password(cls, value: str) -> str:
        return validate_password(value)


class MessageResponse(BaseModel):
    message: str


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
