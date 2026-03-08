/* Anovo Chrome Extension — Popup Logic */

(function () {
  "use strict";

  const DEFAULT_API = "https://rushabh13-anovo-api.hf.space";

  const inputEl = document.getElementById("input");
  const outputArea = document.getElementById("output-area");
  const outputEl = document.getElementById("output");
  const copyBtn = document.getElementById("copy-btn");
  const openBtn = document.getElementById("open-btn");
  const settingsToggle = document.getElementById("settings-toggle");
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const settingsPanel = document.getElementById("settings-panel");
  const apiUrlInput = document.getElementById("api-url");
  const saveBtn = document.getElementById("save-settings");
  const toolBtns = document.querySelectorAll(".tool-btn");

  let currentResult = "";
  let currentTool = "";

  // Load saved API URL
  chrome.storage.sync.get({ apiUrl: DEFAULT_API }, (items) => {
    apiUrlInput.value = items.apiUrl;
  });

  // Settings toggle
  settingsToggle.addEventListener("click", (e) => {
    e.preventDefault();
    settingsPanel.classList.toggle("visible");
  });

  // Sidebar toggle
  sidebarToggle.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.sendMessage({ action: "openSidebar" });
    window.close();
  });

  // Save settings
  saveBtn.addEventListener("click", () => {
    const url = apiUrlInput.value.trim().replace(/\/+$/, "") || DEFAULT_API;
    chrome.storage.sync.set({ apiUrl: url }, () => {
      apiUrlInput.value = url;
      saveBtn.textContent = "Saved!";
      setTimeout(() => (saveBtn.textContent = "Save"), 1500);
    });
  });

  // Copy button
  copyBtn.addEventListener("click", () => {
    if (currentResult) {
      navigator.clipboard.writeText(currentResult);
      copyBtn.textContent = "Copied!";
      setTimeout(() => (copyBtn.textContent = "Copy"), 1500);
    }
  });

  // Open in Anovo button
  openBtn.addEventListener("click", () => {
    const toolPaths = {
      humanize: "/humanize",
      paraphrase: "/paraphrase",
      grammar: "/grammar",
      summarize: "/summarize",
      translate: "/translate",
      tone: "/tone",
    };
    const path = toolPaths[currentTool] || "/";
    chrome.tabs.create({ url: `https://anovo.vercel.app${path}` });
  });

  // Tool buttons
  toolBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tool = btn.dataset.tool;
      const text = inputEl.value.trim();

      if (!text) {
        inputEl.focus();
        inputEl.placeholder = "Please enter some text first...";
        return;
      }

      currentTool = tool;
      processText(tool, text);
    });
  });

  async function processText(tool, text) {
    // Show loading
    outputArea.classList.add("visible");
    outputEl.innerHTML =
      '<div class="loading"><div class="spinner"></div> Processing...</div>';
    copyBtn.style.display = "none";
    openBtn.style.display = "none";

    // Disable buttons
    toolBtns.forEach((b) => (b.disabled = true));

    try {
      const apiUrl = await new Promise((resolve) =>
        chrome.storage.sync.get({ apiUrl: DEFAULT_API }, (items) =>
          resolve(items.apiUrl)
        )
      );

      const endpoints = {
        humanize: {
          path: "/api/humanize",
          body: { text },
          field: "humanized",
        },
        paraphrase: {
          path: "/api/paraphrase",
          body: { text, intensity: 3 },
          field: "paraphrased",
        },
        grammar: {
          path: "/api/grammar-check",
          body: { text, language: "en-US" },
          field: null,
        },
        summarize: {
          path: "/api/summarize",
          body: { text, mode: "paragraph", max_length: 150 },
          field: "summary",
        },
        translate: {
          path: "/api/translate",
          body: { text, source_language: "en", target_language: "fr" },
          field: "translated",
        },
        tone: {
          path: "/api/tone-detect",
          body: { text },
          field: null,
        },
      };

      const ep = endpoints[tool];
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
      let result;

      if (tool === "grammar") {
        if (data.error_count === 0) {
          result = "No grammar errors found.";
        } else {
          result = data.errors
            .map(
              (e) =>
                `• ${e.message} (${e.replacements.slice(0, 3).join(", ")})`
            )
            .join("\n");
        }
      } else if (tool === "tone") {
        result = data.tones
          .slice(0, 5)
          .map((t) => `${t.label}: ${(t.score * 100).toFixed(0)}%`)
          .join("\n");
      } else {
        result = data[ep.field] || JSON.stringify(data);
      }

      currentResult = result;
      outputEl.textContent = result;
      copyBtn.style.display = "inline-block";
      openBtn.style.display = "inline-block";
    } catch (err) {
      outputEl.innerHTML = `<div class="error">${err.message}</div>`;
      currentResult = "";
    } finally {
      toolBtns.forEach((b) => (b.disabled = false));
    }
  }
})();
