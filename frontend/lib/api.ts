const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ParaphraseResponse {
  original: string;
  paraphrased: string;
  intensity: number;
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
    throw new Error(err.detail ?? "Request failed");
  }

  return res.json() as Promise<T>;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const paraphraseText = (text: string, intensity: number) =>
  post<ParaphraseResponse>("/api/paraphrase", { text, intensity });

export const checkGrammar = (text: string, language = "en-US") =>
  post<GrammarResponse>("/api/grammar-check", { text, language });

export const summarizeText = (text: string, mode: string, max_length: number) =>
  post<SummarizeResponse>("/api/summarize", { text, mode, max_length });

export const translateText = (
  text: string,
  source_language: string,
  target_language: string
) => post<TranslateResponse>("/api/translate", { text, source_language, target_language });

export const humanizeText = (text: string) =>
  post<HumanizeResponse>("/api/humanize", { text });

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
