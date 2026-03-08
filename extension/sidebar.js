/* Anovo Chrome Extension — Sidebar Logic */

(function () {
  "use strict";

  const DEFAULT_API = "https://rushabh13-anovo-api.hf.space";

  // Elements
  const authLogin = document.getElementById("auth-login");
  const authUser = document.getElementById("auth-user");
  const authEmail = document.getElementById("auth-email");
  const authPassword = document.getElementById("auth-password");
  const authSubmit = document.getElementById("auth-submit");
  const authError = document.getElementById("auth-error");
  const authUsername = document.getElementById("auth-username");
  const authBadge = document.getElementById("auth-badge");
  const authLogout = document.getElementById("auth-logout");
  const modelSection = document.getElementById("model-section");
  const modelSelect = document.getElementById("model-select");
  const tabs = document.querySelectorAll(".sb-tab");
  const input = document.getElementById("sb-input");
  const processBtn = document.getElementById("sb-process");
  const outputArea = document.getElementById("sb-output-area");
  const outputEl = document.getElementById("sb-output");
  const copyBtn = document.getElementById("sb-copy");
  const modelUsedEl = document.getElementById("sb-model-used");
  const apiUrlInput = document.getElementById("sb-api-url");
  const saveUrlBtn = document.getElementById("sb-save-url");

  let currentTool = "humanize";
  let authToken = null;
  let userData = null;

  // ── Init ────────────────────────────────────────────────────────────────────

  chrome.storage.local.get(["apiUrl", "authToken"], async (items) => {
    apiUrlInput.value = items.apiUrl || DEFAULT_API;
    if (items.authToken) {
      authToken = items.authToken;
      await fetchUser();
    }
  });

  // ── Tab switching ──────────────────────────────────────────────────────────

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      currentTool = tab.dataset.tool;
    });
  });

  // ── Auth ────────────────────────────────────────────────────────────────────

  authSubmit.addEventListener("click", async () => {
    const email = authEmail.value.trim();
    const password = authPassword.value;
    if (!email || !password) return;

    authError.textContent = "";
    authSubmit.disabled = true;
    authSubmit.textContent = "Signing in…";

    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Login failed" }));
        throw new Error(err.detail || "Login failed");
      }

      const data = await res.json();
      authToken = data.access_token;
      chrome.storage.local.set({ authToken });
      await fetchUser();
    } catch (e) {
      authError.textContent = e.message;
    } finally {
      authSubmit.disabled = false;
      authSubmit.textContent = "Sign in";
    }
  });

  authLogout.addEventListener("click", () => {
    authToken = null;
    userData = null;
    chrome.storage.local.remove("authToken");
    showLoginForm();
  });

  async function fetchUser() {
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (!res.ok) throw new Error("Not authenticated");

      userData = await res.json();
      showUserInfo();
    } catch {
      authToken = null;
      userData = null;
      chrome.storage.local.remove("authToken");
      showLoginForm();
    }
  }

  function showLoginForm() {
    authLogin.style.display = "flex";
    authUser.style.display = "none";
    modelSection.style.display = "none";
  }

  function showUserInfo() {
    authLogin.style.display = "none";
    authUser.style.display = "flex";
    authUsername.textContent = userData.username;

    if (userData.is_premium) {
      authBadge.style.display = "inline";
      modelSection.style.display = "block";
    } else {
      authBadge.style.display = "none";
      modelSection.style.display = "none";
    }
  }

  // ── Process ────────────────────────────────────────────────────────────────

  processBtn.addEventListener("click", () => {
    const text = input.value.trim();
    if (!text) {
      input.focus();
      return;
    }
    processText(currentTool, text);
  });

  async function processText(tool, text) {
    outputArea.style.display = "block";
    outputEl.innerHTML = '<div class="sb-loading"><div class="sb-spinner"></div> Processing…</div>';
    copyBtn.style.display = "none";
    modelUsedEl.textContent = "";
    processBtn.disabled = true;
    processBtn.textContent = "Processing…";

    try {
      const apiUrl = getApiUrl();
      const selectedModel = userData?.is_premium ? modelSelect.value : "standard";
      const usePremium = selectedModel !== "standard";

      const endpoints = {
        humanize: { path: "/api/humanize", body: { text, model: selectedModel }, field: "humanized" },
        paraphrase: { path: "/api/paraphrase", body: { text, intensity: 3, model: selectedModel }, field: "paraphrased" },
        grammar: { path: "/api/grammar-check", body: { text, language: "en-US" }, field: null },
        summarize: { path: "/api/summarize", body: { text, mode: "paragraph", max_length: 150 }, field: "summary" },
        translate: { path: "/api/translate", body: { text, source_language: "en", target_language: "fr" }, field: "translated" },
        tone: { path: "/api/tone-detect", body: { text }, field: null },
      };

      const ep = endpoints[tool];
      const headers = { "Content-Type": "application/json" };

      if (usePremium && authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const resp = await fetch(`${apiUrl}${ep.path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(ep.body),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ detail: resp.statusText }));
        throw new Error(err.detail || "Request failed");
      }

      const data = await resp.json();
      let result;

      if (tool === "grammar") {
        result = data.error_count === 0
          ? "No grammar errors found."
          : data.errors.map((e) => `- ${e.message} (${e.replacements.slice(0, 3).join(", ")})`).join("\n");
      } else if (tool === "tone") {
        result = data.tones.slice(0, 5).map((t) => `${t.label}: ${(t.score * 100).toFixed(0)}%`).join("\n");
      } else {
        result = data[ep.field] || JSON.stringify(data);
      }

      outputEl.textContent = result;
      copyBtn.style.display = "inline-block";

      if (data.model_used && data.model_used !== "standard") {
        modelUsedEl.textContent = `Processed with ${data.model_used}`;
      } else if (usePremium && (!data.model_used || data.model_used === "standard")) {
        modelUsedEl.textContent = "Premium model unavailable — used standard";
        modelUsedEl.style.color = "#d97706";
      }
    } catch (err) {
      outputEl.innerHTML = `<div class="sb-error">${err.message}</div>`;
    } finally {
      processBtn.disabled = false;
      processBtn.textContent = "Process";
    }
  }

  // ── Copy ────────────────────────────────────────────────────────────────────

  copyBtn.addEventListener("click", () => {
    const text = outputEl.textContent;
    if (text) {
      navigator.clipboard.writeText(text);
      copyBtn.textContent = "Copied!";
      setTimeout(() => (copyBtn.textContent = "Copy"), 1500);
    }
  });

  // ── Settings ───────────────────────────────────────────────────────────────

  saveUrlBtn.addEventListener("click", () => {
    const url = apiUrlInput.value.trim().replace(/\/+$/, "") || DEFAULT_API;
    chrome.storage.local.set({ apiUrl: url });
    apiUrlInput.value = url;
    saveUrlBtn.textContent = "Saved!";
    setTimeout(() => (saveUrlBtn.textContent = "Save"), 1500);
  });

  function getApiUrl() {
    return (apiUrlInput.value.trim().replace(/\/+$/, "")) || DEFAULT_API;
  }
})();
