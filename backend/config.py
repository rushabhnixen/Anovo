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
    groq_model: str = "llama-3.3-70b-versatile"

    # HuggingFace Inference API — middle-tier fallback between Groq and local
    hf_api_token: str = ""
    hf_model: str = "mistralai/Mistral-7B-Instruct-v0.3"

    # GitHub Models (premium tier) — Meta-Llama-3.1-405B-Instruct
    github_pat: str = ""
    github_model: str = "Meta-Llama-3.1-405B-Instruct"

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

    class Config:
        env_file = ".env"


settings = Settings()
