from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_redoc_html
from fastapi.responses import HTMLResponse

from config import settings
from database import create_tables
from routers import (
    admin, chat, cowriter, document, grammar, humanize,
    paraphrase, plagiarism, summarize, tone, translate,
)
from routers import auth


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
        "tone analysis, co-writing, AI chat, and user accounts."
    ),
    version="2.1.0",
    docs_url="/docs",
    # Served by the custom route below so the ReDoc bundle URL can be pinned.
    redoc_url=None,
    lifespan=lifespan,
)

# FastAPI 0.111 (the version pinned in requirements.txt) points ReDoc at the
# floating "redoc@next" dist-tag, which now resolves to a pre-release whose
# standalone bundle fails to boot — the page loads but renders nothing. Pin an
# exact, known-good release so this cannot drift with either the CDN tag or the
# installed FastAPI version.
REDOC_JS_URL = "https://cdn.jsdelivr.net/npm/redoc@2.1.5/bundles/redoc.standalone.js"


@app.get("/redoc", include_in_schema=False)
def redoc_html() -> HTMLResponse:
    return get_redoc_html(
        openapi_url=app.openapi_url or "/openapi.json",
        title=f"{app.title} - ReDoc",
        redoc_js_url=REDOC_JS_URL,
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
app.include_router(document.router)
app.include_router(admin.router)
app.include_router(auth.router)


@app.get("/", tags=["health"])
def health_check() -> dict:
    """Health check endpoint with provider diagnostics."""
    return {
        "status": "ok",
        "service": "Anovo API",
        "version": app.version,
        "providers": {
            "groq": bool(settings.groq_api_keys or settings.groq_api_key),
            "hf": bool(settings.hf_api_token),
            "premium_models": bool(settings.groq_api_keys or settings.groq_api_key),
        },
        "db": settings.database_url.split("///")[-1] if "sqlite" in settings.database_url else "postgres",
    }
