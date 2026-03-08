# Anovo — Project Reference

> AI-powered writing tool with humanizer, paraphraser, grammar check, summarizer, translator, tone detector, co-writer, chat, and document upload.

---

## Architecture Overview

| Layer | Tech | Hosting | URL |
|-------|------|---------|-----|
| Frontend | Next.js 15, React 18, TailwindCSS 3 | Vercel | https://anovo-frontend.vercel.app (auto-deploys from `main`) |
| Backend | FastAPI 0.111, Python 3.11, SQLite | HuggingFace Spaces (Docker) | https://rushabh13-anovo-api.hf.space |
| Chrome Extension | Manifest V3 | Local / Chrome Web Store | Load from `extension/` folder |
| Source Code | Git | GitHub | https://github.com/rushabhnixen/Anovo |

---

## Repository Structure

```
Anovo/
├── backend/
│   ├── main.py              # FastAPI app, CORS, router mounts
│   ├── config.py             # All env var settings (pydantic-settings)
│   ├── database.py           # SQLAlchemy engine + session
│   ├── Dockerfile            # Docker image for HF Spaces
│   ├── requirements.txt      # Python dependencies
│   ├── .env.example          # Template for backend env vars
│   ├── models/
│   │   ├── db_models.py      # SQLAlchemy models (User, HistoryEntry)
│   │   └── schemas.py        # Pydantic request/response schemas
│   ├── routers/
│   │   ├── auth.py           # Register, login, /me, redeem-promo
│   │   ├── humanize.py       # POST /api/humanize
│   │   ├── paraphrase.py     # POST /api/paraphrase
│   │   ├── grammar.py        # POST /api/grammar-check
│   │   ├── summarize.py      # POST /api/summarize
│   │   ├── translate.py      # POST /api/translate
│   │   ├── plagiarism.py     # POST /api/plagiarism-check
│   │   ├── tone.py           # POST /api/tone-detect
│   │   ├── cowriter.py       # POST /api/co-write
│   │   ├── chat.py           # POST /api/chat
│   │   ├── document.py       # POST /api/upload-doc
│   │   └── history.py        # GET/POST/DELETE /api/history
│   └── services/
│       ├── llm_client.py     # Unified LLM: Groq → HF → error; premium: GitHub Models → Groq → HF
│       ├── groq_client.py    # Multi-key Groq rotation
│       ├── hf_client.py      # HuggingFace Inference fallback
│       ├── humanize_service.py
│       ├── paraphrase_service.py
│       ├── grammar_service.py
│       ├── summarize_service.py
│       ├── translate_service.py
│       ├── plagiarism_service.py
│       ├── tone_service.py
│       ├── cowriter_service.py
│       ├── chat_service.py
│       └── auth_service.py
├── frontend/
│   ├── package.json
│   ├── .env.example
│   ├── app/                  # Next.js App Router pages
│   │   ├── page.tsx          # Homepage
│   │   ├── humanize/page.tsx
│   │   ├── paraphrase/page.tsx
│   │   ├── grammar/page.tsx
│   │   ├── summarize/page.tsx (as /summarize)
│   │   ├── translate/page.tsx
│   │   ├── plagiarism/page.tsx
│   │   ├── tone/page.tsx
│   │   ├── cowriter/page.tsx
│   │   ├── chat/page.tsx
│   │   ├── upload/page.tsx
│   │   ├── history/page.tsx
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── api-docs/page.tsx
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── TextEditor.tsx    # TipTap rich text editor
│   │   ├── OutputDisplay.tsx
│   │   ├── SynonymSlider.tsx
│   │   ├── PremiumToggle.tsx # Premium model toggle switch
│   │   └── PromoCodeModal.tsx# Promo code redemption modal
│   └── lib/
│       ├── api.ts            # All API call functions
│       └── auth-context.tsx  # React auth context (JWT, user state)
└── extension/
    ├── manifest.json         # Manifest V3
    ├── popup.html / popup.js # Extension popup UI
    ├── content.js / content.css # Page overlay for text selection
    ├── background.js         # Context menu service worker
    └── icons/
```

---

## API Endpoints (22 routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | No | Health check |
| POST | `/api/humanize` | Optional | Humanize text (premium flag for 405B) |
| POST | `/api/paraphrase` | Optional | Paraphrase with intensity 1-5 (premium flag for 405B) |
| POST | `/api/grammar-check` | No | Grammar check via LanguageTool |
| POST | `/api/summarize` | No | Summarize (paragraph or bullet mode) |
| POST | `/api/translate` | No | Translate (EN↔FR via Helsinki-NLP) |
| POST | `/api/plagiarism-check` | No | Semantic similarity plagiarism check |
| POST | `/api/tone-detect` | No | Detect tone via zero-shot classification |
| POST | `/api/co-write` | No | AI autocomplete suggestions |
| POST | `/api/chat` | No | AI chat (general/creative/academic) |
| POST | `/api/upload-doc` | No | Upload .docx, humanize or paraphrase, return .docx |
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Login, returns JWT |
| GET | `/api/auth/me` | Yes | Get current user info |
| POST | `/api/auth/redeem-promo` | Yes | Redeem promo code for premium |
| GET | `/api/history` | Yes | List history entries |
| POST | `/api/history` | Yes | Save history entry |
| DELETE | `/api/history/{id}` | Yes | Delete history entry |

Interactive docs: `https://rushabh13-anovo-api.hf.space/docs`

---

## Environment Variables

### Backend (set as HF Space Secrets or in `.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET_KEY` | Yes | Secret for JWT signing. Change from default! |
| `GROQ_API_KEYS` | Yes | Comma-separated Groq API keys for rotation (e.g. `gsk_a,gsk_b,gsk_c,gsk_d`) |
| `GROQ_API_KEY` | No | Single Groq key (backward compat, `GROQ_API_KEYS` preferred) |
| `HF_API_TOKEN` | No | HuggingFace Inference API token (fallback if Groq fails) |
| `GITHUB_PAT` | For premium | GitHub Personal Access Token for GitHub Models API |
| `GITHUB_MODEL` | No | Premium model name (default: `Meta-Llama-3.1-405B-Instruct`) |
| `PREMIUM_PROMO_CODES` | For premium | Comma-separated promo codes (e.g. `LAUNCH2024,BETAUSER`) |
| `DATABASE_URL` | No | Default: `sqlite:///./anovo.db`. Use PostgreSQL for production. |
| `GROQ_MODEL` | No | Default: `llama-3.3-70b-versatile` |
| `CORS_ORIGINS` | No | JSON array of allowed origins. Default: `["http://localhost:3000"]`. Vercel/HF are auto-allowed by regex. |

### Frontend (set in Vercel Environment Variables or `.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend URL. E.g. `https://rushabh13-anovo-api.hf.space` |

---

## LLM Cascade (how AI calls work)

### Free tier (all users)
```
Groq API (llama-3.3-70b-versatile, multi-key rotation)
  → HuggingFace Inference (Mistral-7B, fallback)
    → RuntimeError if both fail
```

### Premium tier (promo code users, `premium: true` in request)
```
GitHub Models API (Meta-Llama-3.1-405B-Instruct)
  → Groq API (fallback)
    → HuggingFace Inference (fallback)
      → RuntimeError if all fail
```

GitHub Models endpoint: `https://models.inference.ai.azure.com/chat/completions`

---

## Premium Tier System

1. User registers and logs in
2. User clicks "Enter Promo Code" in the navbar
3. Server validates code against `PREMIUM_PROMO_CODES` env var
4. User's `is_premium` flag is set to `true` in the database
5. Humanize and Paraphrase pages show a toggle switch to use premium model
6. Server enforces: if `premium: true` in request, user must be authenticated AND `is_premium`

---

## How to Build & Run Locally

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # Edit with your keys
uvicorn main:app --reload --port 8000
```
Backend runs at `http://localhost:8000`. Docs at `http://localhost:8000/docs`.

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local      # Set NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```
Frontend runs at `http://localhost:3000`.

### Chrome Extension
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension/` folder
5. Click the extension icon → set API URL to your backend (default: `http://localhost:8000`)

---

## Deployment

### Frontend → Vercel

1. Connect repo to Vercel (https://vercel.com)
2. Framework preset: **Next.js**
3. Root directory: `frontend`
4. Environment variable: `NEXT_PUBLIC_API_URL` = `https://rushabh13-anovo-api.hf.space`
5. Auto-deploys on push to `main`

### Backend → HuggingFace Spaces

The backend is deployed as a Docker Space. Deployment is done via a separate git repo that pushes to HF.

**Initial setup (one-time):**
```bash
mkdir /tmp/anovo-hf-deploy && cd /tmp/anovo-hf-deploy
git init
git remote add space https://<HF_USERNAME>:<HF_TOKEN>@huggingface.co/spaces/<HF_USERNAME>/anovo-api
```

**Deploy / redeploy:**
```bash
cd /tmp/anovo-hf-deploy

# Clean and copy fresh backend
rm -rf backend Dockerfile requirements.txt
cp -r /workspaces/Anovo/backend .
cp /workspaces/Anovo/backend/requirements.txt .
rm -f backend/anovo.db backend/.env
rm -rf backend/__pycache__ backend/**/__pycache__

# Create the root Dockerfile (HF Spaces needs it at repo root)
cat > Dockerfile <<'EOF'
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./backend/
ENV PYTHONPATH=/app/backend
EXPOSE 7860
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
EOF

git add -A
git commit -m "deploy: update backend"
git push space main --force
```

**HF Space Secrets** (Settings → Repository secrets):
- `JWT_SECRET_KEY`
- `GROQ_API_KEYS` (comma-separated)
- `HF_API_TOKEN`
- `GITHUB_PAT` (for premium)
- `PREMIUM_PROMO_CODES` (for premium)

HF Space URL: `https://rushabh13-anovo-api.hf.space`

---

## Auth System

- **Password hashing:** `passlib[bcrypt]` with `bcrypt==4.0.1`
- **Token format:** JWT (HS256), 7-day expiry
- **Storage:** SQLite (file: `anovo.db` in backend working dir)
- **User model fields:** `id`, `username`, `email`, `hashed_password`, `is_premium`, `created_at`
- **Frontend:** JWT stored in localStorage via `auth-context.tsx`

---

## Key Technical Details

- **Text chunking:** Both humanizer and paraphraser split text into ~2500-char chunks by paragraph boundary, process each independently, then join results. This handles long documents.
- **Max input:** 10,000 characters for humanize and paraphrase requests.
- **Max tokens per LLM call:** 4096
- **Humanize temperature:** 0.7
- **CORS:** Allows `*.vercel.app` and `*.hf.space` via regex, plus explicit origins in `CORS_ORIGINS`.
- **Database:** SQLite by default. Set `DATABASE_URL` to a PostgreSQL connection string for production scale.
- **Groq key rotation:** Keys are rotated round-robin per request via `groq_client.py`. If a key is rate-limited, the next key is tried.

---

## Useful Commands

```bash
# Run backend tests
cd backend && pytest

# Run frontend type check
cd frontend && npx tsc --noEmit

# Build frontend for production
cd frontend && npx next build

# Check backend imports (quick smoke test)
cd backend && python3 -c "from main import app; print(len(app.routes), 'routes')"

# View HF Space logs
# Go to: https://huggingface.co/spaces/rushabh13/anovo-api → "Logs" tab
```

---

## Groq API Keys

Get free keys at https://console.groq.com. The free tier allows multiple keys. Add 3-4 keys for rotation to avoid rate limits. Set them comma-separated in `GROQ_API_KEYS`.

## GitHub PAT (for Premium)

1. https://github.com/settings/tokens → Generate new token (classic)
2. No special scopes needed (GitHub Models access comes from Student Pack)
3. Copy the `ghp_...` token and add as `GITHUB_PAT` in HF Space secrets

---

## Handover Checklist

If handing this project to someone else, they need:

- [ ] Access to the GitHub repo (https://github.com/rushabhnixen/Anovo)
- [ ] Vercel account connected to the repo (or transfer project)
- [ ] HuggingFace account with the Space (https://huggingface.co/spaces/rushabh13/anovo-api)
- [ ] At least 1 Groq API key (free at https://console.groq.com)
- [ ] (Optional) HuggingFace API token for fallback
- [ ] (Optional) GitHub PAT for premium tier
- [ ] Update `JWT_SECRET_KEY` to a new random value
- [ ] Update `PREMIUM_PROMO_CODES` if needed
- [ ] Update `NEXT_PUBLIC_API_URL` in Vercel if the HF Space URL changes
