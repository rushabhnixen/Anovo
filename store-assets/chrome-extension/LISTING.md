# Anovo Chrome Extension — Store Listing

## Name

Anovo — AI Writing Assistant

## Summary

Rewrite and edit selected text with Anovo's unified AI writing workspace.

## Detailed description

Anovo helps you improve writing without leaving the page you are working on.

- Paraphrase and humanize selected text.
- Continue a draft, develop its next paragraph, expand an idea, create a transition, or outline what comes next with CoWriter.
- Correct grammar and spelling.
- Summarize longer passages.
- Translate writing across 75 languages.
- Review tone with ranked, non-generic confidence scores.
- Edit every generated result before copying or replacing text.
- Use the compact popup, full Chrome side panel, or selection context menu.
- Keep your source text when switching between writing tools.

Anovo sends only text you intentionally submit to its secure API. It does not collect browsing history or continuously read page content.

## Category

Productivity

## Language

English

## Single purpose

Anovo improves user-selected or user-entered writing through AI-assisted rewriting and editing.

## Permission justifications

- `activeTab`: Accesses the current page only after the user invokes Anovo.
- `contextMenus`: Adds user-invoked writing actions for selected text.
- `storage`: Stores sign-in state and writing preferences locally.
- `sidePanel`: Provides the full unified writing workspace beside the active page.
- `scripting`: Injects the selection result editor only after a context-menu action.
- Host access to `rushabh13-anovo-api.hf.space`: Sends text the user intentionally submits to the Anovo API.

## Data disclosures

- Website content: selected or entered text is transmitted only after the user requests a writing action.
- Authentication information: an Anovo authentication token can be stored locally after sign-in.
- User-generated content: submitted writing is processed to provide the requested result.
- Data is not sold, used for advertising, or used to determine creditworthiness.
- Privacy policy: https://anovo.vercel.app/privacy

## Test instructions

1. Open the extension popup.
2. Enter a paragraph, select Paraphrase, and run the action.
3. Edit the generated result directly and copy it.
4. Open the side panel and switch between Paraphrase, Humanize, Grammar, Summarize, Translate, Tone, and CoWriter.
5. On a normal HTTPS page, select editable text, right-click, choose Anovo, and run Paraphrase. Edit the result, then choose Replace.

The free Anovo Fast model does not require an account. PRO model selection requires an Anovo premium account.

## Version 1.5.1 release notes

- Restored Anovo's original blue logo across the website and extension.
- Added searchable language selection to the unified translation workspace.
- Added a full CoWriter with Continue, Next paragraph, Expand idea, Transition, and Outline actions.
- Added Match voice, Professional, Friendly, Academic, Persuasive, and Creative writing voices.
- Context-menu actions now respect the same intensity, summary length, language, and model preferences as the popup and side panel.
- Added one-click Regenerate and Open sidebar controls to in-page results.
- Added automatic source-language detection and kept all 75 translation languages.
