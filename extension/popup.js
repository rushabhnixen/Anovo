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
  const translateOptions = document.getElementById("translate-options");
  const sourceLanguage = document.getElementById("source-language");
  const targetLanguage = document.getElementById("target-language");
  globalThis.populateAnovoLanguages(sourceLanguage, "en");
  globalThis.populateAnovoLanguages(targetLanguage, "fr");

  let currentResult = "";

  chrome.storage.local.get(["workspaceTool", "sourceLanguage", "targetLanguage"], (items) => {
    toolEl.value = items.workspaceTool || "paraphrase";
    sourceLanguage.value = items.sourceLanguage || "en";
    targetLanguage.value = items.targetLanguage || "fr";
    updateTool();
  });

  toolEl.addEventListener("change", () => {
    chrome.storage.local.set({ workspaceTool: toolEl.value });
    updateTool();
  });
  sourceLanguage.addEventListener("change", () => chrome.storage.local.set({ sourceLanguage: sourceLanguage.value }));
  targetLanguage.addEventListener("change", () => chrome.storage.local.set({ targetLanguage: targetLanguage.value }));

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
    translateOptions.hidden = toolEl.value !== "translate";
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
    outputEl.value = "Processing…";
    outputEl.readOnly = true;
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
      outputEl.value = currentResult;
      outputEl.readOnly = false;
    } catch (error) {
      outputEl.value = error.message;
      outputEl.readOnly = true;
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
      translate: { path: "/api/translate", body: { text, source_language: sourceLanguage.value, target_language: targetLanguage.value } },
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
    if (!outputEl.value || outputEl.classList.contains("error")) return;
    await navigator.clipboard.writeText(outputEl.value);
    copyBtn.textContent = "Copied";
    setTimeout(() => { copyBtn.textContent = "Copy"; }, 1500);
  });

  openBtn.addEventListener("click", () => chrome.tabs.create({ url: "https://anovo.vercel.app" }));
  sidebarToggle.addEventListener("click", (event) => {
    event.preventDefault();
    chrome.runtime.sendMessage({ action: "openSidebar" });
    window.close();
  });

  function getApiUrl() {
    return DEFAULT_API;
  }
})();
