# Plan Log
<!-- Append-only. Newest at TOP. Written BEFORE implementation begins. -->
<!-- Format: YYYY-MM-DD HH:MM:SS - <one line summary> -->

---

2026-08-05 21:04:12 - Fix QA batch 2 (BUG-012..047): input advisories, grammar engine routing, LLM prompt hardening, mobile status bar

### Context
QA filed 36 further bugs. Root-cause investigation again collapsed them onto far
fewer causes:

- 11 reports (016, 021-027, 035, 040, 041) are one gap: every tool feeds
  non-prose input (JSON, code, digits, emoji) straight to a model that assumes
  sentences, then returns a confident meaningless answer.
- 017/018/019 are one missing parameter: `grammar_service` never sent
  LanguageTool's `level=picky`, leaving style and conjunction rules off.
- 020 is an external limit: LanguageTool ships no Hindi pack, so Hindi returned
  zero errors, which reads as "no mistakes".
- 014/015 share a cause: the summary length target ignored the source length, so
  a two-line input asked for 150 words. The model either padded (inventing
  facts) or returned one sentence — exactly the two reports.
- 028's `[object Object]` was already fixed in the previous batch; the real
  remaining defect was a 5,000-character cap on a tool meant for documents.
- 035/036/042/043 are prompt weaknesses: the draft was pasted unfenced, so
  "Ignore previous instructions" was obeyed and figures were invented freely.
- 038: `text[-9000:]` silently discarded the start of long drafts.
- 030: `chat()` relied on `llm_chat_messages`' 1024-token default.
- 044 is NOT script execution. The only `dangerouslySetInnerHTML` is a static
  theme script; the real defect is TipTap `setContent` parsing user text as
  HTML, turning `<h1>Hello</h1>` into a real heading.
- 034: `capacitor.config.ts` and `MobileRuntime` both set a white status bar
  with Capacitor's `Style.Dark`, which means *light* content — white icons on a
  white bar, invisible in either theme.

Verified by reproduction, not inference: 032 does not reproduce on web.

### Approach
User decisions taken before implementing: warn-but-still-process for non-prose
input; route non-English grammar through the LLM; raise plagiarism to 50k with
chunked comparison; High severity first.

- **One `content_advisory` module** classifies input once and every router
  attaches the result, so the 11 shared-cause reports are fixed in one place and
  future endpoints inherit it.
- **Grammar picks an engine by language**, resolving the workspace's "auto"
  through script detection first. LLM-reported error spans are located locally
  with `str.find` because models cannot count characters reliably.
- **Plagiarism chunks both documents**, scores every pair with a cheap lexical
  containment pass, then re-scores only the top candidates with the LLM so the
  call count stays bounded regardless of document size.
- **Co-writer fences the draft** in `<draft>` tags and is told never to obey
  instructions inside it.
- **TextEditor builds a ProseMirror doc from plain text** rather than letting
  TipTap parse HTML, sharing one block separator so the round-trip is lossless.

### Tradeoffs
- BUG-045 (honour negative instructions) conflicts with BUG-043 (never obey
  instructions in the draft) only while both share one text box. Resolved by
  adding a separate Instructions field: trusted directives go in the system
  message, the draft stays fenced as data. The injection guard was not weakened.
- 029 (exact word counts) is mitigated by prompt discipline only. Models cannot
  reliably count while generating; this reduces drift, it does not remove it.
- 020 fixes Hindi via the LLM. Quality now depends on the provider rather than a
  deterministic rule engine.
- 012 asks for native numerals (१२३ for Hindi). Modern Hindi often uses Western
  digits, so this follows the report rather than universal convention.
- BUG-011's BART fallback remains English-only, unchanged from the last batch.

### Checklist
- [x] `content_advisory` module + wiring into 6 routers
- [x] Grammar: picky level, script detection, LLM engine for unsupported languages
- [x] Plagiarism: 50k cap + bounded chunked comparison
- [x] Co-writer: injection fence, anti-fabrication, hard length limit, context 24k
- [x] Summarizer: length scaled to source, grounding rule
- [x] Translator: native numerals + detected-language reporting
- [x] Chat: 4096-token budget, count and completeness discipline
- [x] TextEditor: plain-text handling, in-editor Ctrl+Enter
- [x] Mobile: theme-aware status bar in both native config and runtime
- [x] Sign-out confirmation, copy buttons in chat and co-writer
- [x] BUG-045: resolved by separating trusted instructions from the untrusted
      draft, so the BUG-043 injection guard still holds
- [ ] BUG-032: not reproducible on web — needs confirmation of the platform
---

2026-08-03 08:39:05 - Fix 11 QA-reported bugs (BUG-001..011): auth validation, API error rendering, nav state, ReDoc, summarizer language

### Context
QA filed 11 bugs, all Pending. Systematic root-cause investigation (not symptom
matching) found that several reports collapse onto shared causes:

- BUG-005 and BUG-009 are the SAME bug. Reproduced against a live TestClient:
  `POST /api/summarize {"text":"AI is useful"}` returns 422 with
  `{"detail":[{"type":"string_too_short","loc":["body","text"],"msg":...}]}`.
  `detail` is an ARRAY of objects. `lib/api.ts:83` does
  `new ApiError(err.detail ?? "Request failed", res.status)`; the `Error`
  constructor stringifies the array, yielding literally `[object Object]`,
  which `WritingWorkspace.tsx:359` and `register/page.tsx:27` render verbatim.
  Emoji passwords hit the same path: JS `minLength=8` counts UTF-16 code units
  so 4 emoji pass the browser check, but Python `len()` counts code points so
  the same value fails `min_length=8` server-side.
- BUG-006/007/008/010 are all one gap: `models/schemas.py` `RegisterRequest`
  types email as a bare `str` (no format check) and constrains username and
  password by length only. `test@gmail`, 8 spaces, `@@@` and `123` all pass.
- BUG-002: `requirements.txt` pins `fastapi==0.111.0`, whose ReDoc page loads
  the floating CDN tag `redoc@next`. Verified by unpacking the 0.111.0 wheel.
  The locally installed 0.141.1 uses the stable `redoc@2`, which is why this
  only reproduces against the deployed API.
- BUG-001: `Navbar.tsx:33` destructures `{ user, logout }` and ignores
  `loading`. `AuthProvider` starts at `user=null`, so every full reload renders
  the signed-out CTA until `/api/auth/me` resolves.
- BUG-003: the Anovo logo `<Link href="/">` at `Navbar.tsx:41` sits outside the
  mobile panel and has no `setMenuOpen(false)`; nothing closes the menu on route
  change, so navigating home leaves it open.
- BUG-011: `_summarize_llm` never tells the model what language to answer in, so
  it defaults to English regardless of input.
- BUG-004 is a missing feature, not a broken path.

Out-of-band finding, confirmed in the same repro: `routers/auth.py` returns
`detail=f"{type(exc).__name__}: {exc}"` on register/login. My test received the
full SQL statement and table schema. User approved fixing this.

### Approach
Fix each root cause once, at the layer that owns it, rather than patching each
reported symptom.

- **One error-shape adapter.** Add `extractErrorMessage()` in `lib/api.ts` that
  understands all three FastAPI `detail` shapes (string, Pydantic array, object)
  and use it in all 8 fetch helpers. Fixes BUG-005 and BUG-009 together and
  immunises every future endpoint against the same class of bug.
- **Validation in Pydantic, mirrored in the UI.** Server is the source of truth
  (`EmailStr`, username pattern, password strength); the forms mirror the same
  rules for immediate feedback. Server-side alone would leave a poor UX;
  client-side alone is bypassable.
- **Close the menu on route change** (`useEffect` on `pathname`) instead of
  adding one more per-link `onClick` — the per-link approach is exactly what
  missed the logo. Keep the existing handlers for same-route clicks.
- **Pin the ReDoc bundle explicitly** via a custom `/redoc` route rather than
  bumping FastAPI, so the fix holds no matter which FastAPI version is resolved.
- **Forgot password**: single-use SHA-256 reset token hashed at rest on the user
  row, 30-minute expiry, generic response to prevent account enumeration.
  Delivery via SMTP when `SMTP_*` is configured, otherwise the link is logged
  (user-selected option).

### Tradeoffs
- Tightening username/password rules is **breaking for existing accounts** that
  were created under the old permissive rules. Applied to registration and reset
  only; login is left alone so current users are not locked out.
- Email is normalised to lowercase on register/login. Slightly beyond the
  literal BUG-006 report, but it closes a duplicate-account hole in the same
  code path.
- `EmailStr` adds an `email-validator` dependency.
- BUG-011 is fixed on the LLM path only. The BART fallback
  (`facebook/bart-large-cnn`) is English-only and cannot summarise Hindi; a
  language directive there is not possible without swapping the model. Out of
  scope, flagged instead.
- Not touching paraphrase/humanize/co-writer for the same language issue —
  BUG-011 reports the summarizer only. Flagged for a follow-up.
- Password rule chosen as letter+digit+non-blank, not a full entropy meter.

### Checklist
- [ ] BUG-005/009 — `extractErrorMessage()` in `lib/api.ts`, all 8 helpers
- [ ] BUG-006 — `EmailStr` + lowercase normalisation
- [ ] BUG-007 — password strength validator (+ bcrypt 72-byte guard)
- [ ] BUG-008/010 — username pattern validator
- [ ] Mirror all three rules in register form UI
- [ ] BUG-001 — Navbar honours `loading`
- [ ] BUG-003 — close mobile menu on pathname change
- [ ] BUG-002 — pin ReDoc bundle URL
- [ ] BUG-011 — language-preserving summarize prompt
- [ ] BUG-004 — reset token model, endpoints, mailer, 2 frontend pages, login link
- [ ] Security — stop leaking exception detail from auth routes
- [ ] Tests for each fix; run backend + frontend suites
