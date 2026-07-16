import "@testing-library/jest-dom";
import {
  paraphraseText,
  refineParaphrase,
  checkGrammar,
  summarizeText,
  translateText,
  humanizeText,
  checkPlagiarism,
  detectTone,
  coWrite,
  chatWithAI,
} from "@/lib/api";

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockSuccess(data: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

function mockFailure(status: number, detail: string) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    statusText: "Error",
    json: () => Promise.resolve({ detail }),
    status,
  });
}

describe("API library", () => {
  const BASE = "http://localhost:8000";

  beforeEach(() => mockFetch.mockClear());

  it("paraphraseText posts correct payload", async () => {
    const expected = { original: "text", paraphrased: "result", intensity: 3 };
    mockSuccess(expected);
    const result = await paraphraseText("text", 3);
    expect(mockFetch).toHaveBeenCalledWith(`${BASE}/api/paraphrase`, expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ text: "text", intensity: 3, model: "standard", writing_mode: "standard" }),
    }));
    expect(result).toEqual(expected);
  });

  it("refineParaphrase requests contextual sentence alternatives", async () => {
    mockSuccess({ selected_text: "A sentence.", kind: "sentence", suggestions: ["Another sentence."] });
    await refineParaphrase("Full text.", "A sentence.", "sentence", "formal", 4, 5);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual({
      text: "Full text.",
      selected_text: "A sentence.",
      kind: "sentence",
      writing_mode: "formal",
      intensity: 4,
      count: 5,
    });
  });

  it("checkGrammar defaults to en-US language", async () => {
    mockSuccess({ original: "text", errors: [], error_count: 0 });
    await checkGrammar("text");
    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body.language).toBe("en-US");
  });

  it("summarizeText posts correct payload", async () => {
    mockSuccess({ original: "text", summary: "short", mode: "bullet" });
    await summarizeText("text", "bullet", 150);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual({ text: "text", mode: "bullet", max_length: 150 });
  });

  it("translateText posts correct payload", async () => {
    mockSuccess({ original: "hello", translated: "bonjour", source_language: "en", target_language: "fr" });
    await translateText("hello", "en", "fr");
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual({ text: "hello", source_language: "en", target_language: "fr" });
  });

  it("humanizeText posts text payload", async () => {
    mockSuccess({ original: "text", humanized: "human text" });
    await humanizeText("text");
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual({ text: "text", model: "standard" });
  });

  it("checkPlagiarism posts both texts", async () => {
    mockSuccess({ text: "a", reference_text: "b", similarity_score: 0.9, is_plagiarized: true, threshold: 0.8 });
    await checkPlagiarism("a", "b");
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual({ text: "a", reference_text: "b" });
  });

  it("detectTone posts text", async () => {
    mockSuccess({ text: "text", tones: [], primary_tone: "formal" });
    await detectTone("text");
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual({ text: "text" });
  });

  it("coWrite posts correct payload", async () => {
    mockSuccess({ prompt: "start", suggestions: ["suggestion"] });
    await coWrite("start", 50, 3);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual({ text: "start", max_tokens: 50, num_suggestions: 3 });
  });

  it("chatWithAI posts message, mode and history", async () => {
    const history = [{ role: "user" as const, content: "hi" }];
    mockSuccess({ reply: "hello!", mode: "general" });
    await chatWithAI("hello", "general", history);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual({ message: "hello", mode: "general", history });
  });

  it("throws an error when the response is not ok", async () => {
    mockFailure(500, "server error");
    await expect(paraphraseText("text", 3)).rejects.toThrow("server error");
  });

  it("sets Content-Type to application/json", async () => {
    mockSuccess({});
    await paraphraseText("text", 3);
    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers["Content-Type"]).toBe("application/json");
  });
});
