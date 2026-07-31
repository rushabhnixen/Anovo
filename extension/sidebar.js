/* Anovo Chrome Extension — Unified Sidebar Workspace */

(function () {
  "use strict";

  const DEFAULT_API = "https://rushabh13-anovo-api.hf.space";
  const TOOL_LABELS = {
    paraphrase: { action: "Paraphrase", result: "Paraphrased text" },
    humanize: { action: "Humanize", result: "Humanized text" },
    grammar: { action: "Check text", result: "Corrected text" },
    summarize: { action: "Summarize", result: "Summary" },
    translate: { action: "Translate", result: "Translation" },
    tone: { action: "Analyze tone", result: "Tone analysis" },
  };

  const authLogin = document.getElementById("auth-login");
  const authUser = document.getElementById("auth-user");
  const authEmail = document.getElementById("auth-email");
  const authPassword = document.getElementById("auth-password");
  const authSubmit = document.getElementById("auth-submit");
  const authError = document.getElementById("auth-error");
  const authUsername = document.getElementById("auth-username");
  const authPlan = document.getElementById("auth-plan");
  const authLogout = document.getElementById("auth-logout");
  const modelSelect = document.getElementById("model-select");
  const modelLock = document.getElementById("model-lock");
  const toolSelect = document.getElementById("tool-select");
  const modeRow = document.getElementById("mode-row");
  const modes = document.querySelectorAll(".sb-mode");
  const input = document.getElementById("sb-input");
  const count = document.getElementById("sb-count");
  const clearBtn = document.getElementById("sb-clear");
  const processBtn = document.getElementById("sb-process");
  const outputArea = document.getElementById("sb-output-area");
  const outputEl = document.getElementById("sb-output");
  const resultLabel = document.getElementById("sb-result-label");
  const copyBtn = document.getElementById("sb-copy");
  const openBtn = document.getElementById("sb-open");
  const useInputBtn = document.getElementById("sb-use-input");
  const modelUsedEl = document.getElementById("sb-model-used");
  const intensityInput = document.getElementById("intensity");
  const intensityValue = document.getElementById("intensity-value");
  const summaryMode = document.getElementById("summary-mode");
  const summaryLength = document.getElementById("summary-length");
  const sourceLanguage = document.getElementById("source-language");
  const targetLanguage = document.getElementById("target-language");

  let currentMode = "standard";
  let authToken = null;
  let userData = null;
  let currentResult = "";

  chrome.storage.local.get([
    "authToken",
    "workspaceTool",
    "workspaceMode",
    "workspaceModel",
    "workspaceIntensity",
    "summaryMode",
    "summaryLength",
    "sourceLanguage",
    "targetLanguage",
  ], async (items) => {
    toolSelect.value = items.workspaceTool || "paraphrase";
    currentMode = items.workspaceMode || "standard";
    modes.forEach((mode) => mode.classList.toggle("active", mode.dataset.mode === currentMode));
    const storedModel = items.workspaceModel || "standard";
    modelSelect.value = Array.from(modelSelect.options).some((option) => option.value === storedModel)
      ? storedModel
      : "standard";
    intensityInput.value = items.workspaceIntensity || "3";
    intensityValue.textContent = intensityInput.value;
    summaryMode.value = items.summaryMode || "paragraph";
    summaryLength.value = items.summaryLength || "150";
    sourceLanguage.value = items.sourceLanguage || "en";
    targetLanguage.value = items.targetLanguage || "fr";
    updateToolUI();
    if (items.authToken) {
      authToken = items.authToken;
      await fetchUser();
    } else {
      updateModelAccess();
    }
  });

  toolSelect.addEventListener("change", () => {
    chrome.storage.local.set({ workspaceTool: toolSelect.value });
    updateToolUI();
  });

  modes.forEach((mode) => {
    mode.addEventListener("click", () => {
      modes.forEach((item) => item.classList.remove("active"));
      mode.classList.add("active");
      currentMode = mode.dataset.mode;
      chrome.storage.local.set({ workspaceMode: currentMode });
    });
  });

  modelSelect.addEventListener("change", () => {
    chrome.storage.local.set({ workspaceModel: modelSelect.value });
  });

  intensityInput.addEventListener("input", () => {
    intensityValue.textContent = intensityInput.value;
    chrome.storage.local.set({ workspaceIntensity: intensityInput.value });
  });
  summaryMode.addEventListener("change", () => chrome.storage.local.set({ summaryMode: summaryMode.value }));
  summaryLength.addEventListener("change", () => chrome.storage.local.set({ summaryLength: summaryLength.value }));
  sourceLanguage.addEventListener("change", () => chrome.storage.local.set({ sourceLanguage: sourceLanguage.value }));
  targetLanguage.addEventListener("change", () => chrome.storage.local.set({ targetLanguage: targetLanguage.value }));

  input.addEventListener("input", updateCount);
  input.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      processCurrentText();
    }
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    currentResult = "";
    outputArea.hidden = true;
    updateCount();
    input.focus();
  });

  processBtn.addEventListener("click", processCurrentText);

  authSubmit.addEventListener("click", async () => {
    const email = authEmail.value.trim();
    const password = authPassword.value;
    if (!email || !password) return;

    authError.textContent = "";
    authSubmit.disabled = true;
    authSubmit.textContent = "Signing in…";
    try {
      const response = await fetch(`${getApiUrl()}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Login failed" }));
        throw new Error(error.detail || "Login failed");
      }
      const data = await response.json();
      authToken = data.access_token;
      await chrome.storage.local.set({ authToken });
      await fetchUser();
    } catch (error) {
      authError.textContent = error.message;
    } finally {
      authSubmit.disabled = false;
      authSubmit.textContent = "Sign in";
    }
  });

  authLogout.addEventListener("click", async () => {
    authToken = null;
    userData = null;
    modelSelect.value = "standard";
    await chrome.storage.local.remove(["authToken", "workspaceModel"]);
    showLoginForm();
  });

  async function fetchUser() {
    try {
      const response = await fetch(`${getApiUrl()}/api/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!response.ok) throw new Error("Not authenticated");
      userData = await response.json();
      showUserInfo();
    } catch {
      authToken = null;
      userData = null;
      await chrome.storage.local.remove("authToken");
      showLoginForm();
    }
  }

  function showLoginForm() {
    authLogin.hidden = false;
    authUser.hidden = true;
    updateModelAccess();
  }

  function showUserInfo() {
    authLogin.hidden = true;
    authUser.hidden = false;
    authUsername.textContent = userData.username;
    authPlan.textContent = userData.is_premium ? "PRO workspace" : "Free plan";
    updateModelAccess();
  }

  function updateModelAccess() {
    const premium = Boolean(userData?.is_premium);
    modelLock.textContent = premium ? "3 models unlocked" : "Sign in for PRO";
    Array.from(modelSelect.options).forEach((option) => {
      option.disabled = option.value !== "standard" && !premium;
    });
    if (!premium) modelSelect.value = "standard";
  }

  function updateToolUI() {
    const tool = toolSelect.value;
    const labels = TOOL_LABELS[tool];
    processBtn.textContent = labels.action;
    resultLabel.textContent = labels.result;
    modeRow.hidden = tool !== "paraphrase";
    document.getElementById("paraphrase-controls").hidden = tool !== "paraphrase";
    document.getElementById("summary-controls").hidden = tool !== "summarize";
    document.getElementById("translation-controls").hidden = tool !== "translate";
    document.getElementById("model-section").hidden = tool !== "paraphrase" && tool !== "humanize";
    input.placeholder = `Paste or type text to ${labels.action.toLowerCase()}…`;
  }

  function updateCount() {
    const words = input.value.trim() ? input.value.trim().split(/\s+/).length : 0;
    count.textContent = `${words} word${words === 1 ? "" : "s"}`;
  }

  function processCurrentText() {
    const text = input.value.trim();
    if (!text) {
      input.focus();
      return;
    }
    processText(toolSelect.value, text);
  }

  async function processText(tool, text) {
    outputArea.hidden = false;
    outputEl.classList.remove("sb-error");
    outputEl.value = "Processing…";
    outputEl.readOnly = true;
    currentResult = "";
    modelUsedEl.textContent = "";
    processBtn.disabled = true;
    processBtn.textContent = "Working…";

    try {
      const selectedModel = userData?.is_premium ? modelSelect.value : "standard";
      const endpoint = getEndpoint(tool, text, selectedModel);
      const headers = { "Content-Type": "application/json" };
      if (selectedModel !== "standard" && authToken) headers.Authorization = `Bearer ${authToken}`;

      const response = await fetch(`${getApiUrl()}${endpoint.path}`, {
        method: "POST",
        headers,
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
      modelUsedEl.textContent = data.model_used && data.model_used !== "standard"
        ? `Processed with ${data.model_used}`
        : selectedModel !== "standard"
          ? "PRO model unavailable — Anovo Fast completed this result"
          : "";
    } catch (error) {
      outputEl.value = error.message;
      outputEl.readOnly = true;
      outputEl.classList.add("sb-error");
    } finally {
      processBtn.disabled = false;
      processBtn.textContent = TOOL_LABELS[tool].action;
    }
  }

  function getEndpoint(tool, text, model) {
    const endpoints = {
      humanize: { path: "/api/humanize", body: { text, model } },
      paraphrase: { path: "/api/paraphrase", body: { text, intensity: Number(intensityInput.value), model, writing_mode: currentMode } },
      grammar: { path: "/api/grammar-check", body: { text, language: "en-US" } },
      summarize: { path: "/api/summarize", body: { text, mode: summaryMode.value, max_length: Number(summaryLength.value) } },
      translate: { path: "/api/translate", body: { text, source_language: sourceLanguage.value, target_language: targetLanguage.value } },
      tone: { path: "/api/tone-detect", body: { text } },
    };
    return endpoints[tool];
  }

  function formatResult(tool, data, sourceText) {
    if (tool === "grammar") {
      return [...data.errors]
        .sort((a, b) => b.offset - a.offset)
        .reduce((text, issue) => {
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
    if (!outputEl.value || outputEl.classList.contains("sb-error")) return;
    await navigator.clipboard.writeText(outputEl.value);
    copyBtn.textContent = "Copied";
    window.setTimeout(() => { copyBtn.textContent = "Copy"; }, 1500);
  });

  openBtn.addEventListener("click", () => {
    chrome.tabs.create({ url: "https://anovo.vercel.app" });
  });

  useInputBtn.addEventListener("click", () => {
    if (!outputEl.value || outputEl.classList.contains("sb-error")) return;
    input.value = outputEl.value;
    updateCount();
    input.focus();
  });

  function getApiUrl() {
    return DEFAULT_API;
  }
})();
