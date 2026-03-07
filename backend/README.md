---
title: Anovo API
emoji: ✍️
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
short_description: AI-powered writing tool backend (FastAPI)
---

# Anovo API

FastAPI backend for [Anovo](https://github.com/rushabhnixen/Anovo) — an open-source AI writing tool.

## Required Secrets (set in Space Settings → Repository secrets)

| Secret | Description |
|---|---|
| `JWT_SECRET_KEY` | Random 32-byte hex string — run `openssl rand -hex 32` |
| `GROQ_API_KEY` | Free API key from [console.groq.com](https://console.groq.com) |

## Optional Secrets

| Secret | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./anovo.db` | SQLite (default) or Postgres URL |
| `CORS_ORIGINS` | Vercel + HF wildcards | JSON array of allowed origins |
