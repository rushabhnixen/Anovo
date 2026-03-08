# Anovo — Project Reference

> AI-powered writing tool with humanizer, paraphraser, grammar check, summarizer, translator, tone detector, co-writer, chat, document upload, admin portal, and Chrome extension sidebar.

---

## Architecture Overview

| Layer | Tech | Hosting | URL |
|-------|------|---------|-----|
| Frontend | Next.js 15, React 18, TailwindCSS 3 | Vercel | https://anovo-frontend.vercel.app (auto-deploys from `main`) |
| Backend | FastAPI 0.111, Python 3.11, SQLite | HuggingFace Spaces (Docker) | https://rushabh13-anovo-api.hf.space |
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
│   ├── app/                  # Next.js App Router pages (19 pages)
│   │   ├── page.tsx          # Homepage
│   │   ├── humanize/page.tsx    # Model selector + model_used display + saveHistory
│   │   ├── paraphrase/page.tsx  # Model selector + model_used display + saveHistory
│   │   ├── grammar/page.tsx     # saveHistory on success
│   │   ├── summarize/page.tsx   # saveHistory on success
│   │   ├── translate/page.tsx   # saveHistory on success
│   │   ├── plagiarism/page.tsx
│   │   ├── tone/page.tsx        # saveHistory on success
│   │   ├── cowriter/page.tsx
│   │   ├── chat/page.tsx
│   │   ├── upload/page.tsx      # Side-by-side comparison + download
│   │   ├── history/page.tsx
│   │   ├── admin/page.tsx       # Admin dashboard (user management, stats)
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── api-docs/page.tsx
│   ├── components/
│   │   ├── Navbar.tsx           # 3 dropdown groups + Admin link for admins
│   │   ├── NavDropdown.tsx      # Click-to-toggle dropdown with outside-click-to-close
│   │   ├── ModelSelector.tsx    # Premium model dropdown (5 models)
│   │   ├── TextEditor.tsx       # TipTap rich text editor
│   │   ├── OutputDisplay.tsx    # Copy button with "Copied!" feedback
│   │   ├── SynonymSlider.tsx
│   │   ├── PremiumToggle.tsx    # Legacy toggle (replaced by ModelSelector)
│   │   ├── PromoCodeModal.tsx   # Promo code redemption modal
│   │   └── ThemeToggle.tsx      # Dark/light mode toggle
│   └── lib/
│       ├── api.ts            # All API calls (tools, auth, history, admin, doc upload/download)
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

## API Endpoints (27 routes)

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
| GET | `/api/history` | Yes | List history entries |
| POST | `/api/history` | Yes | Save history entry |
| DELETE | `/api/history/{id}` | Yes | Delete history entry |
| GET | `/api/admin/users` | Admin | Paginated user list with search |
| PATCH | `/api/admin/users/{id}` | Admin | Toggle user premium/admin status |
| DELETE | `/api/admin/users/{id}` | Admin | Delete user and their history |
| GET | `/api/admin/stats` | Admin | Dashboard stats (users, premium, admin, history count) |

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
| `GITHUB_PAT` | For premium | GitHub **classic** Personal Access Token (must start with `ghp_`). Fine-grained tokens do NOT work. No scopes needed. |
| `GITHUB_MODEL` | No | Default premium model (default: `Meta-Llama-3.1-405B-Instruct`) |
| `PREMIUM_PROMO_CODES` | For premium | Comma-separated promo codes (e.g. `LAUNCH2024,BETAUSER`) |
| `ADMIN_EMAILS` | For admin | Comma-separated emails that auto-become admin on register/login (e.g. `you@example.com`) |
| `DATABASE_URL` | No | Default: `sqlite:///./anovo.db`. On HF Spaces, Dockerfile sets `sqlite:////data/anovo.db` for persistence. |
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

**Available Premium Models:**
| Model ID | Display Name |
|----------|-------------|
| `gpt-4o` | GPT-4o |
| `Meta-Llama-3.1-405B-Instruct` | Llama 405B |
| `Mistral-large-2407` | Mistral Large |
| `Meta-Llama-3.1-70B-Instruct` | Llama 70B |

GitHub Models endpoint: `https://models.inference.ai.azure.com/chat/completions`

**Response transparency:** Every humanize/paraphrase response includes `model_used` field. Frontend shows which model actually ran and a warning if premium fell back to standard.

---

## Model Selector System

1. User registers, logs in, redeems promo code → `is_premium = true`
2. Humanize and Paraphrase pages show `ModelSelector` dropdown with 5 options
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

## Database Persistence (HF Spaces)

**Problem:** HF Spaces Docker containers have ephemeral filesystems. SQLite at `./anovo.db` is lost on every rebuild/restart.

**Solution:** The Dockerfile sets `ENV DATABASE_URL=sqlite:////data/anovo.db`. HF Spaces provides `/data` as persistent storage.

**IMPORTANT:** You must enable persistent storage in your HF Space settings:
1. Go to https://huggingface.co/spaces/rushabh13/anovo-api/settings
2. Scroll to "Persistent storage"
3. Enable it (free tier gives a small volume)

Without persistent storage enabled, `/data` still exists but is NOT persistent across restarts.

### Auto-migration
`database.py` includes `_auto_migrate()` that runs on every startup:
- Inspects existing `users` table columns
- Adds missing columns (`is_premium`, `is_admin`) via `ALTER TABLE`
- This means schema changes are applied automatically without data loss

---

## Chrome Extension (Sidebar)

### Features
- **Side Panel** (Quillbot-style sidebar) via Chrome Side Panel API
- **6 tools:** Humanize, Paraphrase, Grammar, Summarize, Translate, Tone
- **Auth:** Login form in sidebar, token stored in `chrome.storage.local`
- **Model selector:** Visible for premium users, same 5 models as web
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
RUN mkdir -p /data
ENV DATABASE_URL=sqlite:////data/anovo.db
EXPOSE 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
```

**HF Space Secrets** (Settings → Repository secrets):
- `JWT_SECRET_KEY`
- `GROQ_API_KEYS` (comma-separated)
- `HF_API_TOKEN`
- `GITHUB_PAT` (classic token starting with `ghp_`)
- `PREMIUM_PROMO_CODES` (e.g. `LAUNCH2024,BETAUSER`)
- `ADMIN_EMAILS` (e.g. `you@example.com`)

**IMPORTANT:** Enable persistent storage in Space settings, otherwise the DB is still lost on restart.

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
  "db": "/data/anovo.db"
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
- **Storage:** SQLite (persistent at `/data/anovo.db` on HF Spaces)
- **User model fields:** `id`, `username`, `email`, `hashed_password`, `is_premium`, `is_admin`, `created_at`
- **Frontend:** JWT stored in localStorage via `auth-context.tsx`
- **Admin auto-promotion:** Users whose email matches `ADMIN_EMAILS` are auto-promoted to admin on register and login

---

## Key Technical Details

- **Text chunking:** Humanizer and paraphraser split text into ~3500-char chunks by paragraph boundary, process each independently, then join results.
- **Max input:** 10,000 characters for humanize and paraphrase requests.
- **Max tokens per LLM call:** 4096
- **Humanize temperature:** 0.75 (slightly higher for more natural variation)
- **Humanize prompt features:** Tone preservation, concrete before/after example, AI-word replacement list (delve→explore, utilize→use, etc.)
- **CORS:** Allows `*.vercel.app` and `*.hf.space` via regex, plus explicit origins in `CORS_ORIGINS`.
- **Database:** SQLite by default. Set `DATABASE_URL` to a PostgreSQL connection string for production scale.
- **Groq key rotation:** Keys are rotated round-robin per request via `llm_client.py`. If a key is rate-limited, the next key is tried.
- **History auto-save:** All 6 tool pages (humanize, paraphrase, grammar, summarize, translate, tone) save to history after successful processing when user is logged in.
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

1. https://github.com/settings/tokens → **Generate new token (classic)** (NOT fine-grained)
2. No special scopes needed — GitHub Models access is available to all GitHub users
3. Copy the `ghp_...` token and add as `GITHUB_PAT` in HF Space secrets
4. Verify: `curl -s https://rushabh13-anovo-api.hf.space/` should show `"github_models": true`

**Important:** Fine-grained tokens do NOT work with GitHub Models API. You must use a classic token.

---

## Troubleshooting

### "Premium model unavailable — used standard"
1. Check health endpoint: `curl https://rushabh13-anovo-api.hf.space/` — is `github_models: true`?
2. If `false`: GITHUB_PAT secret is missing or empty in HF Space settings
3. If `true`: Check HF Space logs for the exact error (e.g., `HTTP 401: Bad credentials`)
4. Ensure PAT is a **classic** token (starts with `ghp_`), not fine-grained

### "Have to sign up every time"
1. Persistent storage must be enabled on the HF Space
2. Go to Space Settings → Persistent storage → Enable
3. After enabling, the DB file at `/data/anovo.db` will survive rebuilds

### "Admin link not showing"
1. Your email must be in `ADMIN_EMAILS` secret on HF Space
2. You must login (not just register) — admin promotion happens on both
3. After login, the `/api/auth/me` response should show `is_admin: true`
4. Refresh the page if you just configured `ADMIN_EMAILS`

### "History not showing"
1. You must be logged in when using a tool for history to save
2. History is saved automatically after successful processing
3. Check the History page (`/history`) — entries appear after each operation

---

## Handover Checklist

If handing this project to someone else, they need:

- [ ] Access to the GitHub repo (https://github.com/rushabhnixen/Anovo)
- [ ] Vercel account connected to the repo (or transfer project)
- [ ] HuggingFace account with the Space (https://huggingface.co/spaces/rushabh13/anovo-api)
- [ ] Persistent storage enabled on HF Space
- [ ] At least 1 Groq API key (free at https://console.groq.com)
- [ ] (Optional) HuggingFace API token for fallback
- [ ] (Optional) GitHub classic PAT for premium tier
- [ ] Set `JWT_SECRET_KEY` to a new random value
- [ ] Set `ADMIN_EMAILS` to new admin's email
- [ ] Set `PREMIUM_PROMO_CODES` if needed
- [ ] Update `NEXT_PUBLIC_API_URL` in Vercel if the HF Space URL changes
