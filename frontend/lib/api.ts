const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface ParaphraseResponse {
  original: string;
  paraphrased: string;
  intensity: number;
  model_used?: string;
  writing_mode?: ParaphraseMode;
}

export type ParaphraseMode =
  | "standard"
  | "fluency"
  | "formal"
  | "simple"
  | "creative"
  | "academic"
  | "expand"
  | "shorten"
  | "humanize";

export interface ParaphraseRefineResponse {
  selected_text: string;
  kind: "sentence" | "word";
  suggestions: string[];
}

export interface GrammarError {
  message: string;
  offset: number;
  length: number;
  replacements: string[];
  rule_id: string;
  category: string;
}

export interface GrammarResponse {
  original: string;
  errors: GrammarError[];
  error_count: number;
}

export interface SummarizeResponse {
  original: string;
  summary: string;
  mode: string;
}

export interface TranslateResponse {
  original: string;
  translated: string;
  source_language: string;
  target_language: string;
}

export interface HumanizeResponse {
  original: string;
  humanized: string;
  steps?: Record<string, string>;
  model_used?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(err.detail ?? "Request failed", res.status);
  }

  return res.json() as Promise<T>;
}

async function postAuth<T>(path: string, body: unknown, token: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }

  return res.json() as Promise<T>;
}

async function getAuth<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

async function patchAuth<T>(path: string, body: unknown, token: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

async function deleteAuth(path: string, token: string): Promise<void> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }
}

// ── Core tool API calls ──────────────────────────────────────────────────────

export const paraphraseText = (
  text: string,
  intensity: number,
  model = "standard",
  token?: string,
  writingMode: ParaphraseMode = "standard",
) => {
  const body = { text, intensity, model, writing_mode: writingMode };
  if (model !== "standard" && token) {
    return postAuth<ParaphraseResponse>("/api/paraphrase", body, token);
  }
  return post<ParaphraseResponse>("/api/paraphrase", body);
};

function parseSuggestionList(raw: string, selectedText: string, count: number) {
  const selected = selectedText.trim().toLocaleLowerCase().replace(/[.!?]+$/, "");
  const suggestions: string[] = [];

  for (const line of raw.split(/\r?\n/)) {
    const value = line
      .replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "")
      .trim()
      .replace(/^["“”']+|["“”']+$/g, "");
    const comparable = value.toLocaleLowerCase().replace(/[.!?]+$/, "");
    if (!value || comparable === selected) continue;
    if (!suggestions.some((item) => item.toLocaleLowerCase() === value.toLocaleLowerCase())) {
      suggestions.push(value);
    }
    if (suggestions.length === count) break;
  }

  return suggestions;
}

function legacyRefinePrompt(
  text: string,
  selectedText: string,
  kind: "sentence" | "word",
  writingMode: ParaphraseMode,
  intensity: number,
  count: number,
) {
  // The legacy chat endpoint accepts at most 2,000 characters. Keep the
  // selected text and the closest surrounding context inside that limit.
  const contextBudget = Math.max(300, 1500 - selectedText.length);
  const selectionIndex = text.indexOf(selectedText);
  const contextStart = Math.max(0, selectionIndex - Math.floor(contextBudget / 2));
  const context = text.slice(contextStart, contextStart + contextBudget);

  if (kind === "word") {
    return `Return only a numbered list of ${count} distinct replacement words or short phrases. Each option must fit the exact grammar, tense, number, meaning, and ${writingMode} tone of the selected word. Do not repeat it and do not explain.\nSelected word: ${selectedText}\nContext: ${context}`.slice(0, 1950);
  }

  return `Return only a numbered list of ${count} complete sentence rewrites. Preserve every fact, name, number, qualification, citation, and negation, and keep a ${writingMode} tone. Use change level ${intensity} of 5. Do not explain.\nSelected sentence: ${selectedText}\nContext: ${context}`.slice(0, 1950);
}

export const refineParaphrase = async (
  text: string,
  selectedText: string,
  kind: "sentence" | "word",
  writingMode: ParaphraseMode,
  intensity: number,
  count = 5,
) => {
  try {
    return await post<ParaphraseRefineResponse>("/api/paraphrase/refine", {
      text,
      selected_text: selectedText,
      kind,
      writing_mode: writingMode,
      intensity,
      count,
    });
  } catch (error) {
    // The production Space can temporarily lag behind the auto-deployed
    // frontend. Its existing chat route provides a compatible AI fallback.
    if (!(error instanceof ApiError) || error.status !== 404) throw error;

    const response = await post<ChatResponse>("/api/chat", {
      message: legacyRefinePrompt(text, selectedText, kind, writingMode, intensity, count),
      mode: writingMode === "academic" ? "academic" : writingMode === "creative" ? "creative" : "general",
      history: [],
    });
    const suggestions = parseSuggestionList(response.reply, selectedText, count);
    if (!suggestions.length) throw new Error("No distinct alternatives were returned");
    return { selected_text: selectedText, kind, suggestions };
  }
};

export const checkGrammar = (text: string, language = "en-US") =>
  post<GrammarResponse>("/api/grammar-check", { text, language });

export const summarizeText = (text: string, mode: string, max_length: number) =>
  post<SummarizeResponse>("/api/summarize", { text, mode, max_length });

export const translateText = (
  text: string,
  source_language: string,
  target_language: string
) => post<TranslateResponse>("/api/translate", { text, source_language, target_language });

export const humanizeText = (text: string, model = "standard", token?: string) => {
  const body = { text, model };
  if (model !== "standard" && token) {
    return postAuth<HumanizeResponse>("/api/humanize", body, token);
  }
  return post<HumanizeResponse>("/api/humanize", body);
};

// ── Phase 2 Types ────────────────────────────────────────────────────────────

export interface PlagiarismResponse {
  text: string;
  reference_text: string;
  similarity_score: number;
  is_plagiarized: boolean;
  threshold: number;
}

export interface ToneScore {
  label: string;
  score: number;
}

export interface ToneResponse {
  text: string;
  tones: ToneScore[];
  primary_tone: string;
}

export interface CoWriterResponse {
  prompt: string;
  suggestions: string[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  reply: string;
  mode: string;
}

// ── Phase 2 API calls ────────────────────────────────────────────────────────

export const checkPlagiarism = (text: string, reference_text: string) =>
  post<PlagiarismResponse>("/api/plagiarism-check", { text, reference_text });

export const detectTone = (text: string) =>
  post<ToneResponse>("/api/tone-detect", { text });

export const coWrite = (text: string, max_tokens: number, num_suggestions: number) =>
  post<CoWriterResponse>("/api/co-write", { text, max_tokens, num_suggestions });

export const chatWithAI = (message: string, mode: string, history: ChatMessage[]) =>
  post<ChatResponse>("/api/chat", { message, mode, history });

// ── Auth & History Types ──────────────────────────────────────────────────────

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  is_premium: boolean;
  is_admin: boolean;
}

// ── Auth API calls ────────────────────────────────────────────────────────────

export const registerUser = (username: string, email: string, password: string) =>
  post<TokenResponse>("/api/auth/register", { username, email, password });

export const loginUser = (email: string, password: string) =>
  post<TokenResponse>("/api/auth/login", { email, password });

export const getCurrentUser = (token: string) =>
  getAuth<UserResponse>("/api/auth/me", token);

export const deleteCurrentUser = (token: string) =>
  deleteAuth("/api/auth/me", token);

export const redeemPromoCode = (token: string, code: string) =>
  postAuth<UserResponse>("/api/auth/redeem-promo", { code }, token);

// ── Document Upload ─────────────────────────────────────────────────────────

export interface DocProcessResponse {
  original_text: string;
  processed_text: string;
  mode: string;
  filename: string;
}

export const uploadDocument = async (
  file: File,
  mode: "humanize" | "paraphrase",
): Promise<DocProcessResponse> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("mode", mode);

  const res = await fetch(`${API_URL}/api/upload-doc`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Upload failed");
  }

  return res.json() as Promise<DocProcessResponse>;
};

export const downloadProcessedDoc = async (
  processed_text: string,
  filename: string,
): Promise<Blob> => {
  const res = await fetch(`${API_URL}/api/upload-doc/download`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ processed_text, filename }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Download failed");
  }

  return res.blob();
};

// ── Admin API calls ──────────────────────────────────────────────────────────

export interface AdminStatsResponse {
  total_users: number;
  premium_users: number;
  admin_users: number;
  total_history_entries: number;
}

export interface AdminModelsResponse {
  provider: string;
  provider_configured: boolean;
  standard_model: string;
  models: Array<{
    id: string;
    label: string;
    provider_model: string;
    status: "production" | "preview";
  }>;
}

export const getAdminUsers = (token: string, skip = 0, limit = 50, search = "") =>
  getAuth<UserResponse[]>(`/api/admin/users?skip=${skip}&limit=${limit}&search=${encodeURIComponent(search)}`, token);

export const updateAdminUser = (token: string, userId: number, updates: { is_premium?: boolean; is_admin?: boolean }) =>
  patchAuth<UserResponse>(`/api/admin/users/${userId}`, updates, token);

export const deleteAdminUser = (token: string, userId: number) =>
  deleteAuth(`/api/admin/users/${userId}`, token);

export const getAdminStats = (token: string) =>
  getAuth<AdminStatsResponse>("/api/admin/stats", token);

export const getAdminModels = (token: string) =>
  getAuth<AdminModelsResponse>("/api/admin/models", token);
