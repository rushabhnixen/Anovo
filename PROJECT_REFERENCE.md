# Anovo — Project Reference

> AI-powered writing tool with humanizer, paraphraser, grammar check, summarizer, translator, tone detector, co-writer, chat, document upload, admin portal, and Chrome extension sidebar.

---

## Architecture Overview

| Layer | Tech | Hosting | URL |
|-------|------|---------|-----|
| Frontend | Next.js 15, React 18, TailwindCSS 3 | Vercel | https://anovo-frontend.vercel.app (auto-deploys from `main`) |
| Backend | FastAPI 0.111, Python 3.11, PostgreSQL (Neon) | HuggingFace Spaces (Docker) | https://rushabh13-anovo-api.hf.space |
| Chrome Extension | Manifest V3 (Side Panel API) | Local / Chrome Web Store | Load from `extension/` folder |
| Source Code | Git | GitHub | https://github.com/rushabhnixen/Anovo |

---

## Repository Structure

```
Anovo/
├── backend/
│   ├── main.py              # FastAPI app, CORS, router mounts, health check with diagnostics
│   ├── config.py             # All env var settings (pydantic-settings)
│   ├── database.py           # SQLAlchemy engine + session + auto-migration
│   ├── Dockerfile            # Docker image for HF Spaces (persistent DB at /data)
│   ├── requirements.txt      # Python dependencies
│   ├── .env.example          # Template for backend env vars
│   ├── models/
│   │   ├── db_models.py      # SQLAlchemy models (User with is_premium + is_admin, HistoryEntry)
│   │   └── schemas.py        # Pydantic request/response schemas (model selector, admin)
│   ├── routers/
│   │   ├── auth.py           # Register, login, /me, redeem-promo, auto-admin promotion
│   │   ├── admin.py          # Admin portal: user CRUD, stats (requires is_admin)
│   │   ├── humanize.py       # POST /api/humanize (model selector support)
│   │   ├── paraphrase.py     # POST /api/paraphrase (model selector support)
│   │   ├── grammar.py        # POST /api/grammar-check
│   │   ├── summarize.py      # POST /api/summarize
│   │   ├── translate.py      # POST /api/translate
│   │   ├── plagiarism.py     # POST /api/plagiarism-check
│   │   ├── tone.py           # POST /api/tone-detect
│   │   ├── cowriter.py       # POST /api/co-write
│   │   ├── chat.py           # POST /api/chat
│   │   ├── document.py       # POST /api/upload-doc (JSON response + download endpoint)
│   │   └── history.py        # GET/POST/DELETE /api/history
│   └── services/
│       ├── llm_client.py     # Unified LLM: Groq → HF → error; premium: GitHub Models → Groq → HF
│       ├── groq_client.py    # Multi-key Groq rotation (legacy, now in llm_client)
│       ├── hf_client.py      # HuggingFace Inference fallback (legacy, now in llm_client)
│       ├── humanize_service.py  # Improved prompt, tone preservation, chunking, model_used tracking
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
│   ├── app/                  # Next.js App Router pages (18 pages)
│   │   ├── page.tsx          # Homepage
│   │   ├── humanize/page.tsx    # Model selector + model_used display
│   │   ├── paraphrase/page.tsx  # Model selector + model_used display
│   │   ├── grammar/page.tsx
│   │   ├── summarize/page.tsx
│   │   ├── translate/page.tsx
│   │   ├── plagiarism/page.tsx
│   │   ├── tone/page.tsx
│   │   ├── cowriter/page.tsx
│   │   ├── chat/page.tsx
│   │   ├── upload/page.tsx      # Side-by-side comparison + download
│   │   ├── admin/page.tsx       # Admin dashboard (user management, stats)
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── api-docs/page.tsx
│   ├── components/
│   │   ├── Navbar.tsx           # 3 dropdown groups + Admin link for admins
│   │   ├── NavDropdown.tsx      # Click-to-toggle dropdown with outside-click-to-close
│   │   ├── ModelSelector.tsx    # Premium model dropdown (9 options: Standard + 8 premium)
│   │   ├── TextEditor.tsx       # TipTap rich text editor
│   │   ├── OutputDisplay.tsx    # Copy button with "Copied!" feedback
│   │   ├── SynonymSlider.tsx
│   │   ├── PromoCodeModal.tsx   # Promo code redemption modal
│   │   └── ThemeToggle.tsx      # Dark/light mode toggle
│   └── lib/
│       ├── api.ts            # All API calls (tools, auth, admin, doc upload/download)
│       └── auth-context.tsx  # React auth context (JWT, user state with is_admin)
└── extension/
    ├── manifest.json         # Manifest V3 + sidePanel permission
    ├── popup.html / popup.js # Extension popup UI + "Open Sidebar" button
    ├── sidebar.html          # Full sidebar UI (auth, model selector, 6 tools)
    ├── sidebar.js            # Sidebar logic (auth, processing, model_used display)
    ├── sidebar.css           # Sidebar styles with dark mode
    ├── content.js / content.css # Page overlay for text selection
    ├── background.js         # Context menu + side panel registration
    └── icons/
```

---

## API Endpoints (24 routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | No | Health check with provider diagnostics |
| POST | `/api/humanize` | Optional | Humanize text (model selector: standard/gpt-4o/llama-405b/etc) |
| POST | `/api/paraphrase` | Optional | Paraphrase with intensity 1-5 (model selector support) |
| POST | `/api/grammar-check` | No | Grammar check via LanguageTool |
| POST | `/api/summarize` | No | Summarize (paragraph or bullet mode) |
| POST | `/api/translate` | No | Translate (EN↔FR via Helsinki-NLP) |
| POST | `/api/plagiarism-check` | No | Semantic similarity plagiarism check |
| POST | `/api/tone-detect` | No | Detect tone via zero-shot classification |
| POST | `/api/co-write` | No | AI autocomplete suggestions |
| POST | `/api/chat` | No | AI chat (general/creative/academic) |
| POST | `/api/upload-doc` | No | Upload .docx, returns JSON with original + processed text |
| POST | `/api/upload-doc/download` | No | Download processed text as .docx |
| POST | `/api/auth/register` | No | Create account (auto-admin if email in ADMIN_EMAILS) |
| POST | `/api/auth/login` | No | Login, returns JWT (auto-admin promotion) |
| GET | `/api/auth/me` | Yes | Get current user info (includes is_premium, is_admin) |
| POST | `/api/auth/redeem-promo` | Yes | Redeem promo code for premium |
| GET | `/api/admin/users` | Admin | Paginated user list with search |
| PATCH | `/api/admin/users/{id}` | Admin | Toggle user premium/admin status |
| DELETE | `/api/admin/users/{id}` | Admin | Delete user |
| GET | `/api/admin/stats` | Admin | Dashboard stats (users, premium, admin counts) |

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
| `GITHUB_PAT` | For premium | GitHub Personal Access Token. Classic tokens (`ghp_`) work with no scopes. Fine-grained tokens require `models:read` under Account permissions. |
| `GITHUB_MODEL` | No | Default premium model (default: `Meta-Llama-3.1-405B-Instruct`) |
| `PREMIUM_PROMO_CODES` | For premium | Comma-separated promo codes (e.g. `LAUNCH2024,BETAUSER`) |
| `ADMIN_EMAILS` | For admin | Comma-separated emails that auto-become admin on register/login (e.g. `you@example.com`) |
| `DATABASE_URL` | Recommended | Default: `sqlite:///./anovo.db`. For production, use a PostgreSQL connection string (e.g., Neon free tier: `postgresql://user:pass@host/db?sslmode=require`). |
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
    → RuntimeError if both fail → local pipeline fallback
```

### Premium tier (promo code users, model != "standard" in request)
```
GitHub Models API (user-selected model)
  → Groq API (fallback)
    → HuggingFace Inference (fallback)
      → RuntimeError if all fail
```

**Available Premium Models (verified working):**
| Model ID | Display Name | Provider |
|----------|-------------|----------|
| `gpt-4o` | GPT-4o | OpenAI |
| `gpt-4o-mini` | GPT-4o Mini | OpenAI |
| `Meta-Llama-3.1-405B-Instruct` | Llama 405B | Meta |
| `Llama-3.3-70B-Instruct` | Llama 3.3 70B | Meta |
| `Meta-Llama-3.1-8B-Instruct` | Llama 8B (Fast) | Meta |
| `Phi-4` | Phi-4 | Microsoft |
| `DeepSeek-R1` | DeepSeek R1 | DeepSeek |
| `Cohere-command-r-plus-08-2024` | Cohere Command R+ | Cohere |

GitHub Models endpoint: `https://models.inference.ai.azure.com/chat/completions`

**Response transparency:** Every humanize/paraphrase response includes `model_used` field. Frontend shows which model actually ran and a warning if premium fell back to standard.

---

## Model Selector System

1. User registers, logs in, redeems promo code → `is_premium = true`
2. Humanize and Paraphrase pages show `ModelSelector` dropdown with 9 options (Standard + 8 premium)
3. Frontend sends `{ "text": "...", "model": "gpt-4o" }` with `Authorization` header
4. Backend validates: `model != "standard"` → requires authenticated premium user
5. Backend calls `llm_chat_premium()` → tries GitHub Models API with selected model
6. Response includes `model_used` so user knows which model actually processed their text
7. If GitHub Models fails, falls back to standard Groq cascade and `model_used = "standard"`

---

## Admin Portal

### How it works
1. Set `ADMIN_EMAILS=your@email.com` in HF Space secrets
2. Register or login with that email → `is_admin` is auto-set to `true`
3. "Admin" link appears in the navbar (desktop + mobile)
4. Admin dashboard at `/admin` shows:
   - Stats cards: Total Users, Premium Users, Admin Users, History Entries
   - User table with search
   - Toggle premium/admin status per user
   - Delete user (with confirmation)

### Admin API endpoints
All require `Authorization: Bearer <token>` from an admin user.

```
GET  /api/admin/users?skip=0&limit=50&search=query  → UserResponse[]
PATCH /api/admin/users/{id}  body: {is_premium?: bool, is_admin?: bool} → UserResponse
DELETE /api/admin/users/{id}  → 204
GET  /api/admin/stats  → {total_users, premium_users, admin_users, total_history_entries}
```

---

## Database Persistence

**Problem:** HF Spaces Docker containers have ephemeral filesystems. SQLite at `./anovo.db` is lost on every rebuild/restart. HF persistent storage (`/data` volume) requires a paid PRO subscription.

**Solution:** Use an external PostgreSQL database. **Neon** (https://neon.tech) provides a generous free tier.

### Setup with Neon PostgreSQL
1. Create a free account at https://neon.tech
2. Create a new project and database
3. Copy the connection string (looks like `postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require`)
4. Add it as `DATABASE_URL` in HF Space secrets
5. The backend auto-detects PostgreSQL vs SQLite and configures the engine accordingly

### Connection handling
`database.py` handles both SQLite and PostgreSQL:
- **`pool_pre_ping=True`** — detects stale/dropped connections before reuse (essential for Neon which drops idle connections)
- **`pool_recycle=300`** — refreshes connections every 5 minutes (prevents Neon idle timeout errors)
- **Conditional `connect_args`** — `check_same_thread=False` only applied for SQLite, not PostgreSQL

### Auto-migration
`database.py` includes `_auto_migrate()` that runs on every startup:
- Inspects existing `users` table columns
- Adds missing columns (`is_premium`, `is_admin`) via `ALTER TABLE`
- Uses correct boolean defaults per engine: `'FALSE'` for PostgreSQL, `'0'` for SQLite
- Schema changes are applied automatically without data loss

---

## Chrome Extension (Sidebar)

### Features
- **Side Panel** (Quillbot-style sidebar) via Chrome Side Panel API
- **6 tools:** Humanize, Paraphrase, Grammar, Summarize, Translate, Tone
- **Auth:** Login form in sidebar, token stored in `chrome.storage.local`
- **Model selector:** Visible for premium users, same 9 models as web
- **Context menu:** Right-click selected text → Anovo submenu → choose tool
- **Configurable API URL:** Settings section at bottom of sidebar

### Files
- `manifest.json` — Manifest V3, permissions: `contextMenus`, `activeTab`, `storage`, `sidePanel`
- `background.js` — Context menu creation, side panel registration, message handling
- `sidebar.html/js/css` — Full sidebar UI with auth, tool tabs, model selector
- `popup.html/js` — Small popup with "Open Sidebar" button
- `content.js/css` — Content script for page overlay (text selection processing)

### Loading in Chrome
1. `chrome://extensions/` → Enable Developer mode
2. "Load unpacked" → select `extension/` folder
3. Click extension icon → "Open Sidebar" or right-click text on any page

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

The backend is deployed as a Docker Space. The HF Space repo has a **flat structure** (not nested inside `backend/`).

**Deploy / redeploy:**
```bash
# Clone the HF Space repo (one-time)
git clone https://<HF_USERNAME>:<HF_TOKEN>@huggingface.co/spaces/<HF_USERNAME>/anovo-api /tmp/anovo-hf-deploy

# Copy fresh backend files (flat structure — no backend/ subdirectory)
cd /tmp/anovo-hf-deploy
cp /workspaces/Anovo/backend/main.py .
cp /workspaces/Anovo/backend/config.py .
cp /workspaces/Anovo/backend/database.py .
# ALWAYS copy requirements.txt. Missing a newly added dependency (e.g.
# email-validator, which pydantic EmailStr needs) makes the Space build fine
# but crash at import time on the affected route.
cp /workspaces/Anovo/backend/requirements.txt .
cp /workspaces/Anovo/backend/models/*.py models/
cp /workspaces/Anovo/backend/services/*.py services/
cp /workspaces/Anovo/backend/routers/*.py routers/
# DO NOT copy anovo.db, .env, or __pycache__

# Verify
python3 -c "from main import app; print(len(app.routes), 'routes')"

# Commit and push
git add -A && git commit -m "deploy: update backend"
git push origin main --force
```

**HF Space Dockerfile** (already in repo):
```Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
```

**HF Space Secrets** (Settings → Repository secrets):
- `JWT_SECRET_KEY`
- `GROQ_API_KEYS` (comma-separated)
- `HF_API_TOKEN`
- `GITHUB_PAT` (classic `ghp_` token or fine-grained with `models:read`)
- `PREMIUM_PROMO_CODES` (e.g. `LAUNCH2024,BETAUSER`)
- `ADMIN_EMAILS` (e.g. `you@example.com`)
- `DATABASE_URL` (Neon PostgreSQL connection string, e.g. `postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require`)

**IMPORTANT:** Set `DATABASE_URL` to a Neon PostgreSQL connection string in Space secrets. Without it, SQLite is used and data is lost on every restart.

HF Space URL: `https://rushabh13-anovo-api.hf.space`

---

## Health Check & Diagnostics

Hit `GET /` to verify the API is running and providers are configured:

```json
{
  "status": "ok",
  "service": "Anovo API",
  "version": "2.0.0",
  "providers": {
    "groq": true,
    "hf": false,
    "github_models": true
  },
  "db": "postgres"
}
```

- `groq: true` → At least one Groq API key is set
- `hf: true` → HuggingFace API token is set
- `github_models: true` → `GITHUB_PAT` is set (premium will work)
- `db` → Shows which database file is in use

If `github_models: false`, the `GITHUB_PAT` secret is not reaching the app (check HF Space secrets).

---

## Auth System

- **Password hashing:** `passlib[bcrypt]` with `bcrypt==4.0.1`
- **Token format:** JWT (HS256), 7-day expiry
- **Storage:** PostgreSQL (Neon) in production, SQLite for local dev
- **User model fields:** `id`, `username`, `email`, `hashed_password`, `is_premium`, `is_admin`, `created_at`
- **Frontend:** JWT stored in localStorage via `auth-context.tsx`
- **Admin auto-promotion:** Users whose email matches `ADMIN_EMAILS` are auto-promoted to admin on register and login

---

## Key Technical Details

- **Text chunking:** Humanizer and paraphraser split text into ~3500-char chunks by paragraph boundary, process each independently, then join results.
- **Max input:** 10,000 characters for humanize and paraphrase requests.
- **Max tokens per LLM call:** 4096
- **Humanize temperature:** 0.45 for consistent register-aware rewriting; corrective retries use 0.25
- **Humanize prompt features:** Strict fact/number/citation preservation, automatic register detection, direct-language rewriting, boilerplate removal, cross-chunk voice continuity, and one automatic retry when objective quality checks fail
- **CORS:** Allows `*.vercel.app` and `*.hf.space` via regex, plus explicit origins in `CORS_ORIGINS`.
- **Database:** SQLite by default for local dev. PostgreSQL (Neon free tier) for production on HF Spaces. Configured via `DATABASE_URL` env var.
- **Groq key rotation:** Keys are rotated round-robin per request via `llm_client.py`. If a key is rate-limited, the next key is tried.
- **Copy feedback:** Copy button shows "Copied!" with green styling for 2 seconds.
- **Navbar:** 3 dropdown groups (Writing Tools, Analysis, More) + Admin link when admin.

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

# Check health + provider status on live API
curl -s https://rushabh13-anovo-api.hf.space/ | python3 -m json.tool

# View HF Space logs
# Go to: https://huggingface.co/spaces/rushabh13/anovo-api → "Logs" tab
```

---

## Groq API Keys

Get free keys at https://console.groq.com. The free tier allows multiple keys. Add 3-4 keys for rotation to avoid rate limits. Set them comma-separated in `GROQ_API_KEYS`.

## GitHub PAT (for Premium Models)

**Option A — Classic token (simplest):**
1. https://github.com/settings/tokens → **Generate new token (classic)**
2. No special scopes needed
3. Copy the `ghp_...` token and add as `GITHUB_PAT` in HF Space secrets

**Option B — Fine-grained token:**
1. https://github.com/settings/tokens?type=beta → **Generate new token**
2. Under **Account permissions**, set `Models` → `Read`
3. Copy the token and add as `GITHUB_PAT` in HF Space secrets

**Verify:** `curl -s https://rushabh13-anovo-api.hf.space/` should show `"github_models": true`

---

## Troubleshooting

### "Premium model unavailable — used standard"
1. Check health endpoint: `curl https://rushabh13-anovo-api.hf.space/` — is `github_models: true`?
2. If `false`: GITHUB_PAT secret is missing or empty in HF Space settings
3. If `true`: Check HF Space logs for the exact error (e.g., `HTTP 401: Bad credentials`)
4. If using a classic token, ensure it starts with `ghp_`. If using fine-grained token, ensure `models:read` is enabled under Account permissions

### "Have to sign up every time"
1. This means the database is being lost between restarts
2. Use an external PostgreSQL database (Neon free tier) instead of SQLite
3. Set `DATABASE_URL` to your Neon connection string in HF Space secrets
4. Verify by checking `GET /` — `db` field should show `"postgres"` not a file path

### "Admin link not showing"
1. Your email must be in `ADMIN_EMAILS` secret on HF Space
2. You must login (not just register) — admin promotion happens on both
3. After login, the `/api/auth/me` response should show `is_admin: true`
4. Refresh the page if you just configured `ADMIN_EMAILS`

### "SSL connection has been closed unexpectedly" (Neon PostgreSQL)
1. This happens when Neon drops idle connections
2. The fix is already in `database.py`: `pool_pre_ping=True` and `pool_recycle=300`
3. If this error persists, restart the HF Space to reset the connection pool

---

## Handover Checklist

If handing this project to someone else, they need:

- [ ] Access to the GitHub repo (https://github.com/rushabhnixen/Anovo)
- [ ] Vercel account connected to the repo (or transfer project)
- [ ] HuggingFace account with the Space (https://huggingface.co/spaces/rushabh13/anovo-api)
- [ ] Neon PostgreSQL database (free at https://neon.tech), connection string set as `DATABASE_URL`
- [ ] At least 1 Groq API key (free at https://console.groq.com)
- [ ] (Optional) HuggingFace API token for fallback
- [ ] (Optional) GitHub classic PAT for premium tier
- [ ] Set `JWT_SECRET_KEY` to a new random value
- [ ] Set `ADMIN_EMAILS` to new admin's email
- [ ] Set `PREMIUM_PROMO_CODES` if needed
- [ ] Update `NEXT_PUBLIC_API_URL` in Vercel if the HF Space URL changes
