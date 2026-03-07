from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    languagetool_url: str = "http://localhost:8010"
    paraphrase_model: str = "Vamsi/T5_Paraphrase_Paws"
    summarize_model: str = "facebook/bart-large-cnn"
    translate_en_fr_model: str = "Helsinki-NLP/opus-mt-en-fr"
    translate_fr_en_model: str = "Helsinki-NLP/opus-mt-fr-en"
    plagiarism_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    plagiarism_threshold: float = 0.8
    tone_model: str = "facebook/bart-large-mnli"
    cowriter_model: str = "distilgpt2"
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "llama3"
    max_input_length: int = 1024
    cors_origins: list[str] = ["http://localhost:3000", "https://*.vercel.app"]

    class Config:
        env_file = ".env"


settings = Settings()
