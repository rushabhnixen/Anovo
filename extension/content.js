/* Anovo Chrome Extension — Content Script */

(function () {
  "use strict";

  let overlay = null;

  function getSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(
        {
          apiUrl: "https://rushabh13-anovo-api.hf.space",
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

    const resp = await fetch(`${settings.apiUrl}${ep.path}`, {
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
    positionOverlay(overlay);

    overlay.querySelector(".anovo-close").addEventListener("click", removeOverlay);

    return overlay;
  }

  function positionOverlay(element) {
    const selection = window.getSelection();
    let anchor = null;

    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      anchor = selection.getRangeAt(0).getBoundingClientRect();
    }

    if (!anchor || (!anchor.width && !anchor.height)) {
      const active = document.activeElement;
      if (active && (active.tagName === "TEXTAREA" || active.tagName === "INPUT" || active.isContentEditable)) {
        anchor = active.getBoundingClientRect();
      }
    }

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

  function updateOverlay(result, originalText) {
    if (!overlay) return;
    const body = overlay.querySelector(".anovo-body");
    body.innerHTML = `<div class="anovo-result">${escapeHtml(result)}</div>`;

    const copyBtn = overlay.querySelector(".anovo-btn-copy");
    const replaceBtn = overlay.querySelector(".anovo-btn-replace");

    copyBtn.style.display = "inline-block";
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(result);
      copyBtn.textContent = "Copied!";
      setTimeout(() => (copyBtn.textContent = "Copy"), 1500);
    });

    replaceBtn.style.display = "inline-block";
    replaceBtn.addEventListener("click", () => {
      replaceSelectedText(result);
      removeOverlay();
    });
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

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, "<br>");
  }

  function replaceSelectedText(newText) {
    const active = document.activeElement;
    if (active && (active.tagName === "TEXTAREA" || active.tagName === "INPUT")) {
      const start = active.selectionStart;
      const end = active.selectionEnd;
      active.value = active.value.slice(0, start) + newText + active.value.slice(end);
      active.selectionStart = start;
      active.selectionEnd = start + newText.length;
      active.dispatchEvent(new Event("input", { bubbles: true }));
    } else if (active?.getAttribute("contenteditable") === "true") {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(newText));
      }
    }
  }

  // Listen for messages from background
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action !== "process") return;

    showOverlay(msg.text, msg.tool);

    callApi(msg.tool, msg.text)
      .then((result) => updateOverlay(result, msg.text))
      .catch((err) => showError(err.message));
  });
})();
