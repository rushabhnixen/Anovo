# Task Tracker
<!-- Append-only. Newest at TOP. -->
<!-- Format: ## YYYY-MM-DD HH:MM:SS — <summary> -->

## 2026-08-17 15:05:00 - QA re-test round: 9 refusals, grammar supplement, figure grounding, 1 regression fixed
**Type:** task-complete
**Outcome:** QA confirmed 26 of 47 solved. Caught and fixed a High-severity
regression I had introduced: coupling language detection into the translation call
as one JSON object made auto-detect return empty 3 of 4 times. Two QA verdicts
reversed earlier decisions with evidence: warn-but-process was rejected for 9 bugs
(now refusals), and level=picky was proven insufficient by querying
api.languagetool.org directly. Diagnosed why exactly the three mobile bugs stayed
open - the Android bundle was from Jul 16 and contained none of the work. Replaced
prompt-hope with a deterministic figure-grounding filter for BUG-036/042. Two
defects found only by testing production rather than unit tests: Spanish grammar
explanations for English input, and a '["' leaking into suggestion text.
**Files changed:** backend/services/translate_service.py, grammar_service.py,
cowriter_service.py, content_advisory.py; backend/routers/tone.py, plagiarism.py,
grammar.py, cowriter.py; backend/models/schemas.py; backend/tests/*;
frontend/lib/auth-context.tsx, validation.ts; frontend/__tests__/lib/validation.test.ts;
frontend android/ios synced bundles; PROJECT_REFERENCE.md

## 2026-08-05 21:04:12 - QA batch 2 (BUG-012..047): 35 fixed, 1 not reproducible on web
**Type:** task-complete
**Outcome:** Root-cause analysis again collapsed 36 reports onto about 9 causes.
Biggest win: one `content_advisory` module fixed 11 reports at once. Corrected two
QA mis-diagnoses with evidence - BUG-044 is not script execution (TipTap parsing
user text as HTML; ProseMirror never runs <script>), and BUG-020 is a LanguageTool
capability limit (no Hindi pack), now routed to the LLM. Found a second source of
BUG-034 in capacitor.config.ts that the runtime fix alone would not have covered.
Two tests caught real design errors mid-implementation: a min_words threshold that
would have warned on legitimate short co-writer prompts, and a summary word floor
that made the target longer than a 9-word source. BUG-032 verified NOT reproducible
on web by driving the running app. BUG-045 resolved by separating trusted author
instructions from the untrusted draft, so the BUG-043 injection guard holds too.
**Files changed:** backend/services/content_advisory.py, grammar_service.py,
plagiarism_service.py, cowriter_service.py, summarize_service.py,
translate_service.py, chat_service.py; backend/routers/grammar.py, tone.py,
plagiarism.py, cowriter.py, paraphrase.py, summarize.py, translate.py;
backend/models/schemas.py; backend/tests/test_content_quality.py, test_batch3.py,
test_api.py; frontend/components/AdvisoryBanner.tsx, CopyButton.tsx,
TextEditor.tsx, MobileRuntime.tsx, Navbar.tsx, WritingWorkspace.tsx;
frontend/app/cowriter/page.tsx, frontend/app/chat/page.tsx;
frontend/capacitor.config.ts; frontend/lib/api.ts;
frontend/__tests__/components/TextEditor.test.tsx; .claude/launch.json;
docs/plan.md; audit/changelog.md

## 2026-08-03 08:51:04 — Fix all 11 QA-reported bugs (BUG-001..011) + auth error-detail leak
**Type:** task-complete
**Outcome:** All 11 bugs fixed at root cause, each with a regression test. Root-cause
investigation collapsed 11 reports onto 7 distinct causes: BUG-005/009 were one bug
(FastAPI's 422 `detail` array stringified to `[object Object]`), and BUG-006/007/008/010
were one gap (registration validated length only). Reproduced BUG-005 against a live
TestClient and confirmed BUG-002 by unpacking the pinned FastAPI 0.111.0 wheel, which
points ReDoc at the floating `redoc@next` tag. Also fixed an approved out-of-scope
finding: register/login returned raw exception text, leaking SQL and schema to
unauthenticated callers. Verified with 98 backend tests, 83 frontend tests, clean
tsc/ESLint/flake8 (exact CI command), a successful production build, and a 27-check
end-to-end script covering every QA repro step against a real database.
**Files changed:** frontend/lib/api.ts, frontend/lib/validation.ts,
frontend/components/Navbar.tsx, frontend/app/register/page.tsx,
frontend/app/login/page.tsx, frontend/app/forgot-password/page.tsx,
frontend/app/reset-password/page.tsx, frontend/__tests__/lib/api-errors.test.ts,
frontend/__tests__/lib/validation.test.ts, frontend/__tests__/components/Navbar.test.tsx,
backend/models/schemas.py, backend/models/db_models.py, backend/database.py,
backend/services/auth_service.py, backend/services/mailer.py,
backend/services/summarize_service.py, backend/routers/auth.py, backend/main.py,
backend/config.py, backend/requirements.txt, backend/tests/test_auth_validation.py,
README.md, docs/plan.md, audit/changelog.md
