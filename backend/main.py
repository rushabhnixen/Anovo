from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import create_tables
from routers import (
    chat, cowriter, grammar, humanize,
    paraphrase, plagiarism, summarize, tone, translate,
)
from routers import auth, history


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    yield


app = FastAPI(
    title="Anovo API",
    description=(
        "AI-Powered Writing Tool API — Free & Open Source\n\n"
        "Endpoints for paraphrasing, grammar checking, summarization, "
        "translation, AI text humanization, plagiarism detection, "
        "tone analysis, co-writing, AI chat, user accounts, and history."
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"https://.*\.(vercel\.app|hf\.space)$",
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
app.include_router(plagiarism.router)
app.include_router(tone.router)
app.include_router(cowriter.router)
app.include_router(chat.router)
app.include_router(auth.router)
app.include_router(history.router)


@app.get("/", tags=["health"])
def health_check() -> dict:
    """Health check endpoint."""
    return {"status": "ok", "service": "Anovo API", "version": app.version}
