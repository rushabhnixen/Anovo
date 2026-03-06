from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers import grammar, humanize, paraphrase, summarize, translate

app = FastAPI(
    title="Anovo API",
    description=(
        "AI-Powered Writing Tool API — Free & Open Source\n\n"
        "Endpoints for paraphrasing, grammar checking, summarization, "
        "translation, and AI text humanization."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(paraphrase.router)
app.include_router(grammar.router)
app.include_router(summarize.router)
app.include_router(translate.router)
app.include_router(humanize.router)


@app.get("/", tags=["health"])
def health_check() -> dict:
    """Health check endpoint."""
    return {"status": "ok", "service": "Anovo API", "version": "1.0.0"}
