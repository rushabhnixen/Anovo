/* Anovo Chrome Extension — Content Script */

(function () {
  "use strict";

  let overlay = null;

  function getApiUrl() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(
        { apiUrl: "https://rushabh13-anovo-api.hf.space" },
        (items) => resolve(items.apiUrl)
      );
    });
  }

  async function callApi(tool, text) {
    const apiUrl = await getApiUrl();
    const endpoints = {
      humanize: { path: "/api/humanize", body: { text }, field: "humanized" },
      paraphrase: { path: "/api/paraphrase", body: { text, intensity: 3 }, field: "paraphrased" },
      grammar: { path: "/api/grammar-check", body: { text, language: "en-US" }, field: null },
      summarize: { path: "/api/summarize", body: { text, mode: "paragraph", max_length: 150 }, field: "summary" },
      translate: { path: "/api/translate", body: { text, source_language: "en", target_language: "fr" }, field: "translated" },
      tone: { path: "/api/tone-detect", body: { text }, field: null },
    };

    const ep = endpoints[tool];
    if (!ep) throw new Error(`Unknown tool: ${tool}`);

    const resp = await fetch(`${apiUrl}${ep.path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

    overlay.querySelector(".anovo-close").addEventListener("click", removeOverlay);

    return overlay;
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
