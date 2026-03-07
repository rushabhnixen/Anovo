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

    # Chat — Groq (free) is used when groq_api_key is set; falls back to Ollama
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "llama3"

    cors_origins: list[str] = [
        "http://localhost:3000",
        "https://*.vercel.app",
        "https://*.hf.space",
    ]

    # Auth & DB
    database_url: str = "sqlite:///./anovo.db"
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 days

    class Config:
        env_file = ".env"


settings = Settings()
