# Anovo — AI-Powered Writing Tool — Free & Open Source

> A full-featured, open-source alternative to QuillBot powered by HuggingFace Transformers, FastAPI, and Next.js.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Backend CI](https://github.com/rushabhnixen/Anovo/actions/workflows/ci.yml/badge.svg)](https://github.com/rushabhnixen/Anovo/actions/workflows/ci.yml)

---

## ✨ Features

### Phase 1 (Current)
| # | Feature | Status |
|---|---------|--------|
| 1 | **Paraphraser** — 9 writing modes with contextual sentence and word alternatives | ✅ |
| 2 | **Synonym Slider** — Control paraphrase intensity (1–5) | ✅ |
| 3 | **Grammar Checker** — LanguageTool integration with inline highlights | ✅ |
| 4 | **Summarizer** — BART/PEGASUS summarization (paragraph & bullet) | ✅ |
| 5 | **Translator** — 100+ languages via Helsinki-NLP OpusMT | ✅ |
| 6 | **Text-to-Speech** — Browser Web Speech API (play/pause/stop) | ✅ |
| 7 | **Developer API** — Auto-generated OpenAPI/Swagger docs | ✅ |
| 8 | **AI Text Humanizer** — Multi-step pipeline to humanize AI text | ✅ |

### Phase 2 (Current)
| # | Feature | Status |
|---|---------|--------|
| 9 | **AI Chat Modes** — Llama 3 / Mistral 7B via Ollama | ✅ |
| 10 | **Plagiarism Checker** — Semantic similarity detection | ✅ |
| 11 | **Tone Detector** — Formal / casual / persuasive classification | ✅ |
| 12 | **Co-Writer** — AI autocomplete suggestions | ✅ |

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 + TypeScript + Tailwind CSS + TipTap |
| **Backend** | Python 3.11 + FastAPI + HuggingFace Transformers |
| **Grammar** | LanguageTool (self-hosted via Docker) |
| **Translation** | Helsinki-NLP OpusMT models |
| **AI Chat/Modes** | Llama 3 / Mistral 7B (via Ollama) |
| **Hosting** | HuggingFace Spaces (backend) + Vercel (frontend) |
| **CI/CD** | GitHub Actions |
| **Mobile** | Capacitor 8 (Android + iOS) |

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker & Docker Compose (for LanguageTool)

### 1. Clone the repository
```bash
git clone https://github.com/rushabhnixen/Anovo.git
cd Anovo
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in `backend/`:
```env
LANGUAGETOOL_URL=http://localhost:8010
PARAPHRASE_MODEL=Vamsi/T5_Paraphrase_Paws
SUMMARIZE_MODEL=facebook/bart-large-cnn
TRANSLATE_EN_FR_MODEL=Helsinki-NLP/opus-mt-en-fr
TRANSLATE_FR_EN_MODEL=Helsinki-NLP/opus-mt-fr-en
PLAGIARISM_MODEL=sentence-transformers/all-MiniLM-L6-v2
TONE_MODEL=facebook/bart-large-mnli
COWRITER_MODEL=distilgpt2
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3
```

Start the backend:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```

Create a `.env.local` file in `frontend/`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the frontend:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3b. Mobile apps

The Android and iOS projects live in `frontend/android` and `frontend/ios`. Build and sync the bundled mobile frontend with:

```bash
cd frontend
npm run mobile:sync
npm run mobile:assets
```

See [MOBILE_APP.md](MOBILE_APP.md) for native prerequisites, signing, store metadata, privacy declarations, and publishing steps.

### 4. Docker Setup (LanguageTool + Backend)
```bash
docker-compose up -d
```

This starts:
- **LanguageTool** on port `8010`
- **Anovo Backend** on port `8000`

---

## 📖 API Documentation

Once the backend is running, visit:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/paraphrase` | Paraphrase text with intensity control |
| POST | `/api/paraphrase/refine` | Suggest contextual alternatives for a sentence or word |
| POST | `/api/grammar-check` | Check grammar, spelling, and punctuation |
| POST | `/api/summarize` | Summarize text (paragraph or bullet mode) |
| POST | `/api/translate` | Translate between 100+ languages |
| POST | `/api/humanize` | Humanize AI-generated text |
| POST | `/api/plagiarism-check` | Check for plagiarism via semantic similarity |
| POST | `/api/tone-detect` | Detect text tone (formal, casual, etc.) |
| POST | `/api/co-write` | Generate AI autocomplete suggestions |
| POST | `/api/chat` | AI chat with multiple modes |

---

## 🔧 Project Structure

```
Anovo/
├── README.md
├── .gitignore
├── docker-compose.yml
├── backend/
│   ├── requirements.txt
│   ├── main.py
│   ├── config.py
│   ├── routers/
│   │   ├── paraphrase.py
│   │   ├── grammar.py
│   │   ├── summarize.py
│   │   ├── translate.py
│   │   ├── humanize.py
│   │   ├── plagiarism.py
│   │   ├── tone.py
│   │   ├── cowriter.py
│   │   └── chat.py
│   ├── services/
│   │   ├── paraphrase_service.py
│   │   ├── grammar_service.py
│   │   ├── summarize_service.py
│   │   ├── translate_service.py
│   │   ├── humanize_service.py
│   │   ├── plagiarism_service.py
│   │   ├── tone_service.py
│   │   ├── cowriter_service.py
│   │   └── chat_service.py
│   └── models/
│       └── schemas.py
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── next.config.js
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── paraphrase/page.tsx
    │   ├── grammar/page.tsx
    │   ├── summarize/page.tsx
    │   ├── translate/page.tsx
    │   ├── humanize/page.tsx
    │   ├── plagiarism/page.tsx
    │   ├── tone/page.tsx
    │   ├── cowriter/page.tsx
    │   ├── chat/page.tsx
    │   └── api-docs/page.tsx
    ├── components/
    │   ├── Navbar.tsx
    │   ├── TextEditor.tsx
    │   ├── SynonymSlider.tsx
    │   ├── TextToSpeech.tsx
    │   ├── LanguageSelector.tsx
    │   └── OutputDisplay.tsx
    └── lib/
        └── api.ts
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure:
- Python code passes `flake8` linting
- Frontend code passes `eslint` and `tsc`
- New features include basic tests

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 🗺 Roadmap

- **Phase 1** (Weeks 1–2): Core writing tools (paraphrase, grammar, summarize, translate, TTS, humanize)
- **Phase 2** (Weeks 3–4): AI Chat modes, plagiarism checker, tone detector, co-writer
- **Phase 3** (Weeks 5–6): User accounts, saved history, browser extension, mobile app

---

*Built with ❤️ as a free, open-source alternative to QuillBot.*
