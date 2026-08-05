import "@testing-library/jest-dom";
import { summarizeText, registerUser } from "@/lib/api";

const mockFetch = jest.fn();
global.fetch = mockFetch;

/** FastAPI returns 422 validation failures with `detail` as an ARRAY. */
function mockValidationError(detail: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status: 422,
    statusText: "Unprocessable Entity",
    json: () => Promise.resolve({ detail }),
  });
}

describe("API error messages (BUG-005, BUG-009)", () => {
  beforeEach(() => mockFetch.mockClear());

  it("renders a readable message for a short summarizer input instead of [object Object]", async () => {
    // Exact payload captured from POST /api/summarize {"text":"AI is useful"}
    mockValidationError([
      {
        type: "string_too_short",
        loc: ["body", "text"],
        msg: "String should have at least 50 characters",
        input: "AI is useful",
        ctx: { min_length: 50 },
      },
    ]);

    await expect(summarizeText("AI is useful", "paragraph", 150)).rejects.toThrow(
      "Text: String should have at least 50 characters",
    );
  });

  it("never surfaces [object Object] to the user", async () => {
    mockValidationError([
      { type: "string_too_short", loc: ["body", "password"], msg: "String should have at least 8 characters" },
    ]);

    await expect(registerUser("user", "user@example.com", "🙂🙂")).rejects.toThrow(
      /^(?!.*\[object Object\]).*$/,
    );
  });

  it("joins multiple field errors into one sentence", async () => {
    mockValidationError([
      { type: "value_error", loc: ["body", "username"], msg: "Username must be 3-32 characters" },
      { type: "value_error", loc: ["body", "email"], msg: "value is not a valid email address" },
    ]);

    await expect(registerUser("@@@", "user@gmail", "password1")).rejects.toThrow(
      "Username: Username must be 3-32 characters. Email: value is not a valid email address",
    );
  });

  it("still handles a plain string detail from a raised HTTPException", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      statusText: "Conflict",
      json: () => Promise.resolve({ detail: "Email already registered" }),
    });

    await expect(registerUser("user", "user@example.com", "password1")).rejects.toThrow(
      "Email already registered",
    );
  });

  it("falls back to status text when the body is not JSON", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      statusText: "Bad Gateway",
      json: () => Promise.reject(new Error("not json")),
    });

    await expect(summarizeText("x".repeat(60), "paragraph", 150)).rejects.toThrow("Bad Gateway");
  });
});
