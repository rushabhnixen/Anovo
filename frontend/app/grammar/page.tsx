"use client";

import { useState } from "react";
import TextEditor from "@/components/TextEditor";
import { checkGrammar, GrammarError } from "@/lib/api";

interface HighlightedTextProps {
  text: string;
  errors: GrammarError[];
}

function HighlightedText({ text, errors }: HighlightedTextProps) {
  if (!errors.length) return <span>{text}</span>;

  const parts: { text: string; error?: GrammarError }[] = [];
  let cursor = 0;

  const sorted = [...errors].sort((a, b) => a.offset - b.offset);

  for (const err of sorted) {
    if (err.offset > cursor) {
      parts.push({ text: text.slice(cursor, err.offset) });
    }
    parts.push({ text: text.slice(err.offset, err.offset + err.length), error: err });
    cursor = err.offset + err.length;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor) });

  return (
    <span>
      {parts.map((p, i) =>
        p.error ? (
          <span
            key={i}
            title={`${p.error.message}\nSuggestions: ${p.error.replacements.join(", ") || "none"}`}
            className="underline decoration-wavy decoration-red-500 cursor-help bg-red-50 dark:bg-red-950/40"
          >
            {p.text}
          </span>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </span>
  );
}

export default function GrammarPage() {
  const [inputText, setInputText] = useState("");
  const [language, setLanguage] = useState("en-US");
  const [errors, setErrors] = useState<GrammarError[]>([]);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);
  const [apiError, setApiError] = useState("");

  const handleCheck = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setApiError("");
    setChecked(false);
    try {
      const res = await checkGrammar(inputText, language);
      setErrors(res.errors);
      setChecked(true);
    } catch (e) {
      setApiError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Grammar Checker</h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
        Detect and fix grammar, spelling, and punctuation errors with LanguageTool.
      </p>

      <div className="flex flex-col gap-4">
        <TextEditor value={inputText} onChange={setInputText} placeholder="Enter text to check…" />

        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm px-3 py-2"
            >
              <option value="en-US">English (US)</option>
              <option value="en-GB">English (UK)</option>
              <option value="de-DE">German</option>
              <option value="fr">French</option>
              <option value="es">Spanish</option>
              <option value="pt">Portuguese</option>
            </select>
          </div>

          <button
            onClick={handleCheck}
            disabled={loading || !inputText.trim()}
            className="mt-5 px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {loading ? "Checking…" : "Check Grammar"}
          </button>
        </div>

        {apiError && <p className="text-red-500 text-sm">{apiError}</p>}

        {checked && (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">
                {errors.length === 0 ? (
                  <span className="text-green-600">✅ No errors found!</span>
                ) : (
                  <span className="text-red-600">{errors.length} issue{errors.length !== 1 ? "s" : ""} found</span>
                )}
              </span>
            </div>
            <p className="text-sm leading-relaxed">
              <HighlightedText text={inputText} errors={errors} />
            </p>

            {errors.length > 0 && (
              <ul className="mt-4 space-y-2">
                {errors.map((err, i) => (
                  <li key={i} className="text-sm p-2 bg-red-50 dark:bg-red-950/40 rounded-md">
                    <strong className="text-red-700 dark:text-red-400">{err.message}</strong>
                    {err.replacements.length > 0 && (
                      <span className="text-gray-600 dark:text-gray-400">
                        {" "}— Suggestions: {err.replacements.slice(0, 3).join(", ")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
