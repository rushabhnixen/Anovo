/* Anovo Chrome Extension — Content Script */

(function () {
  "use strict";

  if (window.__ANOVO_CONTENT_SCRIPT__) return;
  window.__ANOVO_CONTENT_SCRIPT__ = true;

  let overlay = null;
  let selectionContext = null;
  const DEFAULT_API = "https://rushabh13-anovo-api.hf.space";

  function getSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(
        {
          authToken: null,
          workspaceModel: "standard",
          workspaceMode: "standard",
        },
        (items) => resolve(items)
      );
    });
  }

  async function callApi(tool, text) {
    const settings = await getSettings();
    const selectedModel = settings.authToken ? settings.workspaceModel : "standard";
    const endpoints = {
      humanize: { path: "/api/humanize", body: { text, model: selectedModel }, field: "humanized" },
      paraphrase: {
        path: "/api/paraphrase",
        body: { text, intensity: 3, model: selectedModel, writing_mode: settings.workspaceMode },
        field: "paraphrased",
      },
      grammar: { path: "/api/grammar-check", body: { text, language: "en-US" }, field: null },
      summarize: { path: "/api/summarize", body: { text, mode: "paragraph", max_length: 150 }, field: "summary" },
      translate: { path: "/api/translate", body: { text, source_language: "en", target_language: "fr" }, field: "translated" },
      tone: { path: "/api/tone-detect", body: { text }, field: null },
    };

    const ep = endpoints[tool];
    if (!ep) throw new Error(`Unknown tool: ${tool}`);

    const headers = { "Content-Type": "application/json" };
    if (selectedModel !== "standard" && settings.authToken) {
      headers.Authorization = `Bearer ${settings.authToken}`;
    }

    const resp = await fetch(`${DEFAULT_API}${ep.path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(ep.body),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: resp.statusText }));
      throw new Error(err.detail || "Request failed");
    }

    const data = await resp.json();

    // Special formatting for grammar and tone
    if (tool === "grammar") {
      if (data.error_count === 0) return "No grammar errors found.";
      return data.errors
        .map((e) => `• ${e.message} (${e.replacements.slice(0, 3).join(", ")})`)
        .join("\n");
    }
    if (tool === "tone") {
      return data.tones
        .slice(0, 5)
        .map((t) => `${t.label}: ${(t.score * 100).toFixed(0)}%`)
        .join("\n");
    }

    return data[ep.field] || JSON.stringify(data);
  }

  function showOverlay(text, tool) {
    selectionContext = captureSelection();
    removeOverlay();

    overlay = document.createElement("div");
    overlay.id = "anovo-overlay";
    overlay.innerHTML = `
      <div class="anovo-header">
        <span class="anovo-title">Anovo — ${tool.charAt(0).toUpperCase() + tool.slice(1)}</span>
        <button class="anovo-close">&times;</button>
      </div>
      <div class="anovo-body">
        <div class="anovo-loading">
          <div class="anovo-spinner"></div>
          Processing...
        </div>
      </div>
      <div class="anovo-footer">
        <button class="anovo-btn anovo-btn-copy" style="display:none">Copy</button>
        <button class="anovo-btn anovo-btn-replace" style="display:none">Replace</button>
      </div>
    `;

    document.body.appendChild(overlay);
    positionOverlay(overlay, selectionContext?.rect);

    overlay.querySelector(".anovo-close").addEventListener("click", removeOverlay);

    return overlay;
  }

  function positionOverlay(element, savedRect) {
    let anchor = savedRect;

    if (!anchor) {
      anchor = { left: window.innerWidth - 440, right: window.innerWidth - 20, top: 20, bottom: 20, width: 420, height: 0 };
    }

    const width = Math.min(420, window.innerWidth - 24);
    const left = Math.min(Math.max(12, anchor.left), window.innerWidth - width - 12);
    const estimatedHeight = Math.min(440, window.innerHeight * 0.78);
    const below = anchor.bottom + 10;
    const top = below + estimatedHeight > window.innerHeight
      ? Math.max(12, anchor.top - estimatedHeight - 10)
      : Math.max(12, below);

    element.style.width = `${width}px`;
    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
    element.style.right = "auto";
  }

  function updateOverlay(result) {
    if (!overlay) return;
    const body = overlay.querySelector(".anovo-body");
    body.innerHTML = '<textarea class="anovo-result" aria-label="Edit Anovo result"></textarea>';
    const resultEditor = body.querySelector(".anovo-result");
    resultEditor.value = result;

    const copyBtn = overlay.querySelector(".anovo-btn-copy");
    const replaceBtn = overlay.querySelector(".anovo-btn-replace");

    copyBtn.style.display = "inline-block";
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(resultEditor.value);
      copyBtn.textContent = "Copied!";
      setTimeout(() => (copyBtn.textContent = "Copy"), 1500);
    });

    if (selectionContext?.editable) {
      replaceBtn.style.display = "inline-block";
      replaceBtn.addEventListener("click", () => {
        replaceSelectedText(resultEditor.value);
        removeOverlay();
      });
    }
    resultEditor.focus();
  }

  function showError(message) {
    if (!overlay) return;
    const body = overlay.querySelector(".anovo-body");
    body.innerHTML = `<div class="anovo-error">${escapeHtml(message)}</div>`;
  }

  function removeOverlay() {
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
  }

  function captureSelection() {
    const active = document.activeElement;
    if (active && (active.tagName === "TEXTAREA" || active.tagName === "INPUT")) {
      const start = active.selectionStart;
      const end = active.selectionEnd;
      return {
        editable: start !== end,
        element: active,
        start,
        end,
        rect: active.getBoundingClientRect(),
      };
    }

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0).cloneRange();
      const editable = range.commonAncestorContainer.parentElement?.closest("[contenteditable='true']");
      return {
        editable: Boolean(editable),
        element: editable,
        range,
        rect: range.getBoundingClientRect(),
      };
    }
    return null;
  }

  function replaceSelectedText(newText) {
    if (!selectionContext?.editable) return;
    const target = selectionContext.element;
    if (target && (target.tagName === "TEXTAREA" || target.tagName === "INPUT")) {
      const { start, end } = selectionContext;
      target.value = target.value.slice(0, start) + newText + target.value.slice(end);
      target.selectionStart = start;
      target.selectionEnd = start + newText.length;
      target.dispatchEvent(new Event("input", { bubbles: true }));
      target.dispatchEvent(new Event("change", { bubbles: true }));
      target.focus();
    } else if (selectionContext.range) {
      const range = selectionContext.range;
      range.deleteContents();
      const node = document.createTextNode(newText);
      range.insertNode(node);
      target?.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: newText }));
    }
  }

  // Listen for messages from background
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action !== "process") return;

    showOverlay(msg.text, msg.tool);

    callApi(msg.tool, msg.text)
      .then((result) => updateOverlay(result))
      .catch((err) => showError(err.message));
  });
})();
