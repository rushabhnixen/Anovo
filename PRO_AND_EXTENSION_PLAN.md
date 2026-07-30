# Anovo PRO and Extension Plan

## Product direction

Anovo should behave like one writing workspace, not a directory of disconnected tools. The source text stays on the left, the active result stays on the right, and every operation is selected from the workspace toolbar. Contextual word and sentence alternatives appear beside the selection.

The legacy tool URLs remain compatible for shared links and mobile deep links, but they render the same workspace with the requested tool preselected.

## Phase 1 — unified foundation (implemented)

- One workspace for Paraphrase, Humanize, Grammar, Summarize, Translate, and Tone.
- Anchored contextual alternatives for individual words and sentences.
- One shared input when switching tools.
- One visual system across navigation, editors, output cards, account flows, and legacy workflows.
- PRO model selector inside the workspace instead of on a separate page.
- Optional PRO-versus-Anovo-Fast comparison.
- Chrome popup and side panel redesigned as the same unified workspace.
- Browser selection actions open beside the selected text instead of in a fixed corner.

## Phase 2 — production PRO experience

### Model orchestration

- Replace raw provider model IDs in the UI with stable Anovo profiles: Fast, Precise, Creative, Academic, and Reasoning.
- Maintain provider routing on the server so models can be replaced without changing the client or extension.
- Add provider health checks, latency budgets, automatic failover, and a visible fallback explanation.
- Stream long generations and process independent chunks concurrently while preserving document order.

### Compare and choose

- Let PRO users compare two or three model outputs in parallel.
- Show meaningful comparison dimensions: faithfulness, readability, change level, length, and latency.
- Allow a user to select the best full result or mix individual sentence alternatives from different models.
- Save selected model pairs as reusable presets.

### Advanced controls

- Custom voice profiles based on user-provided samples.
- Terminology and “never change” lists for names, citations, product terms, and regulated language.
- Audience, reading level, region, tone, and output-length controls.
- Document-wide consistency checks after chunked processing.
- Version history, named documents, favorites, and reusable prompts.

### Commercial and operational controls

- Replace promo-only access with subscription plans and an entitlement service.
- Add usage meters based on processed input/output tokens instead of request count.
- Configure monthly limits, fair-use safeguards, and per-model cost ceilings.
- Provide account billing, cancellation, invoices, and data-export controls.
- Record privacy-safe model latency, fallback rate, failure rate, and user selection rate.

## Phase 3 — Chrome extension

- Share the same entitlement and model-profile configuration as the website.
- Add inline alternatives for the selected sentence or word on any editable webpage.
- Keep a document session between popup, side panel, and the full web workspace.
- Support “replace”, “insert below”, “copy”, and “open in workspace” actions.
- Add Gmail, Google Docs, LinkedIn, and common rich-text editor adapters.
- Use explicit site permissions and on-demand access rather than broad persistent access where possible.
- Package automated extension smoke tests and a signed Chrome Web Store release checklist.

## Release gates

1. Contextual popovers remain visible and usable at every viewport size.
2. Switching tools never discards source text without confirmation.
3. Free requests do not accidentally call paid models.
4. PRO fallbacks are visible and never billed as the requested premium model.
5. Long-text processing preserves facts, protected tokens, and paragraph order.
6. Website, Android wrapper, iOS wrapper, popup, sidebar, and content overlay use the same canonical URLs and product vocabulary.
