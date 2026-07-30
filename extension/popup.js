/* Anovo Chrome Extension — Quick Workspace */

(function () {
  "use strict";

  const DEFAULT_API = "https://rushabh13-anovo-api.hf.space";
  const LABELS = {
    paraphrase: ["Paraphrase", "Paraphrased text"],
    humanize: ["Humanize", "Humanized text"],
    grammar: ["Check text", "Corrected text"],
    summarize: ["Summarize", "Summary"],
    translate: ["Translate", "Translation"],
    tone: ["Analyze tone", "Tone analysis"],
  };

  const toolEl = document.getElementById("tool");
  const inputEl = document.getElementById("input");
  const countEl = document.getElementById("count");
  const processBtn = document.getElementById("process");
  const outputArea = document.getElementById("output-area");
  const outputEl = document.getElementById("output");
  const resultLabel = document.getElementById("result-label");
  const copyBtn = document.getElementById("copy-btn");
  const openBtn = document.getElementById("open-btn");
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const apiUrlInput = document.getElementById("api-url");
  const saveBtn = document.getElementById("save-settings");

  let currentResult = "";

  chrome.storage.local.get(["apiUrl", "workspaceTool"], (items) => {
    apiUrlInput.value = items.apiUrl || DEFAULT_API;
    toolEl.value = items.workspaceTool || "paraphrase";
    updateTool();
  });

  toolEl.addEventListener("change", () => {
    chrome.storage.local.set({ workspaceTool: toolEl.value });
    updateTool();
  });

  inputEl.addEventListener("input", updateCount);
  inputEl.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      run();
    }
  });
  processBtn.addEventListener("click", run);

  function updateTool() {
    processBtn.textContent = LABELS[toolEl.value][0];
    resultLabel.textContent = LABELS[toolEl.value][1];
  }

  function updateCount() {
    const words = inputEl.value.trim() ? inputEl.value.trim().split(/\s+/).length : 0;
    countEl.textContent = `${words} word${words === 1 ? "" : "s"}`;
  }

  async function run() {
    const text = inputEl.value.trim();
    if (!text) {
      inputEl.focus();
      return;
    }
    const tool = toolEl.value;
    outputArea.classList.add("visible");
    outputEl.classList.remove("error");
    outputEl.innerHTML = '<div class="loading"><span class="spinner"></span>Processing…</div>';
    processBtn.disabled = true;
    processBtn.textContent = "Working…";
    currentResult = "";

    try {
      const endpoint = getEndpoint(tool, text);
      const response = await fetch(`${getApiUrl()}${endpoint.path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(endpoint.body),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(error.detail || "Request failed");
      }
      const data = await response.json();
      currentResult = formatResult(tool, data, text);
      outputEl.textContent = currentResult;
    } catch (error) {
      outputEl.textContent = error.message;
      outputEl.classList.add("error");
    } finally {
      processBtn.disabled = false;
      processBtn.textContent = LABELS[tool][0];
    }
  }

  function getEndpoint(tool, text) {
    return {
      humanize: { path: "/api/humanize", body: { text } },
      paraphrase: { path: "/api/paraphrase", body: { text, intensity: 3, writing_mode: "standard" } },
      grammar: { path: "/api/grammar-check", body: { text, language: "en-US" } },
      summarize: { path: "/api/summarize", body: { text, mode: "paragraph", max_length: 150 } },
      translate: { path: "/api/translate", body: { text, source_language: "en", target_language: "fr" } },
      tone: { path: "/api/tone-detect", body: { text } },
    }[tool];
  }

  function formatResult(tool, data, sourceText) {
    if (tool === "grammar") {
      return [...data.errors].sort((a, b) => b.offset - a.offset).reduce((text, issue) => {
        const replacement = issue.replacements[0];
        return replacement
          ? text.slice(0, issue.offset) + replacement + text.slice(issue.offset + issue.length)
          : text;
      }, sourceText);
    }
    if (tool === "tone") {
      return data.tones.slice(0, 6).map((tone) => (
        `${tone.label.charAt(0).toUpperCase()}${tone.label.slice(1)}  ${Math.round(tone.score * 100)}%`
      )).join("\n");
    }
    const fields = { humanize: "humanized", paraphrase: "paraphrased", summarize: "summary", translate: "translated" };
    return data[fields[tool]] || JSON.stringify(data);
  }

  copyBtn.addEventListener("click", async () => {
    if (!currentResult) return;
    await navigator.clipboard.writeText(currentResult);
    copyBtn.textContent = "Copied";
    setTimeout(() => { copyBtn.textContent = "Copy"; }, 1500);
  });

  openBtn.addEventListener("click", () => chrome.tabs.create({ url: "https://anovo.vercel.app" }));
  sidebarToggle.addEventListener("click", (event) => {
    event.preventDefault();
    chrome.runtime.sendMessage({ action: "openSidebar" });
    window.close();
  });

  saveBtn.addEventListener("click", async () => {
    const url = getApiUrl();
    await chrome.storage.local.set({ apiUrl: url });
    apiUrlInput.value = url;
    saveBtn.textContent = "Saved";
    setTimeout(() => { saveBtn.textContent = "Save"; }, 1500);
  });

  function getApiUrl() {
    return apiUrlInput.value.trim().replace(/\/+$/, "") || DEFAULT_API;
  }
})();
