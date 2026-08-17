from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Grammar — defaults to free public API; override with self-hosted URL
    languagetool_url: str = "https://api.languagetool.org"

    # ML models
    paraphrase_model: str = "Vamsi/T5_Paraphrase_Paws"
    summarize_model: str = "facebook/bart-large-cnn"
    translate_en_fr_model: str = "Helsinki-NLP/opus-mt-en-fr"
    translate_fr_en_model: str = "Helsinki-NLP/opus-mt-fr-en"
    plagiarism_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    plagiarism_threshold: float = 0.8
    tone_model: str = "facebook/bart-large-mnli"
    cowriter_model: str = "distilgpt2"
    max_input_length: int = 1024

    # Groq API — supports multiple keys (comma-separated) for fallback/rotation
    # e.g. GROQ_API_KEYS=gsk_key1,gsk_key2,gsk_key3,gsk_key4
    groq_api_key: str = ""       # single key (backward compatible)
    groq_api_keys: str = ""      # comma-separated list of keys
    # Llama 3.3 70B is scheduled to shut down on Groq free/developer tiers on
    # 2026-08-16. GPT-OSS 20B is the supported low-latency replacement.
    groq_model: str = "openai/gpt-oss-20b"

    # HuggingFace Inference API — middle-tier fallback between Groq and local
    hf_api_token: str = ""
    hf_model: str = "openai/gpt-oss-20b:fastest"

    # Retained only so older deployments can boot while the secret is removed.
    # GitHub Models was retired on 2026-07-30 and is no longer called.
    github_pat: str = ""
    github_model: str = "gpt-oss-120b"

    # Premium promo codes (comma-separated)
    premium_promo_codes: str = ""

    # Admin emails (comma-separated) — users with these emails auto-become admin
    admin_emails: str = ""

    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "llama3"

    cors_origins: list[str] = ["http://localhost:3000"]

    # Auth & DB
    # Default uses local file. On HF Spaces, set DATABASE_URL=sqlite:////data/anovo.db
    # to persist across container restarts (HF mounts /data as persistent volume).
    database_url: str = "sqlite:///./anovo.db"
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 days

    # Password reset
    # Public origin of the frontend, used to build the link in the reset email.
    frontend_url: str = "http://localhost:3000"
    reset_token_expire_minutes: int = 30

    # Brevo HTTPS API. Preferred on HuggingFace Spaces, which blocks outbound
    # SMTP ports (25/465/587) — smtplib times out there no matter the
    # credentials. This is a v3 API key (xkeysib-...), NOT the SMTP key.
    brevo_api_key: str = ""
    email_from_name: str = "Anovo"

    # SMTP. Used when no Brevo API key is set. When neither is configured the
    # reset link is written to the application log instead of being emailed, so
    # the flow is usable in local development without credentials.
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "no-reply@anovo.app"
    smtp_use_tls: bool = True

    @property
    def smtp_configured(self) -> bool:
        return bool(self.smtp_host)

    class Config:
        env_file = ".env"


settings = Settings()
