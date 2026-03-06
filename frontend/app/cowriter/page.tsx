"use client";

import { useState } from "react";
import TextEditor from "@/components/TextEditor";
import { coWrite } from "@/lib/api";

export default function CoWriterPage() {
  const [inputText, setInputText] = useState("");
  const [maxTokens, setMaxTokens] = useState(50);
  const [numSuggestions, setNumSuggestions] = useState(3);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError("");
    setSuggestions([]);
    try {
      const res = await coWrite(inputText, maxTokens, numSuggestions);
      setSuggestions(res.suggestions);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleUseSuggestion = (suggestion: string) => {
    setInputText(inputText + " " + suggestion);
    setSuggestions([]);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Co-Writer</h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
        Get AI-powered autocomplete suggestions to continue your writing.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Your Text
          </label>
          <TextEditor
            value={inputText}
            onChange={setInputText}
            placeholder="Start writing and get AI suggestions…"
          />

          {/* Controls */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Max tokens: {maxTokens}
              </label>
              <input
                type="range"
                min={10}
                max={200}
                step={10}
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
                className="accent-brand-600"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Suggestions
              </label>
              <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setNumSuggestions(n)}
                    className={`px-3 py-1.5 text-sm transition-colors ${
                      numSuggestions === n
                        ? "bg-brand-600 text-white"
                        : "bg-white dark:bg-gray-950 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !inputText.trim()}
            className="self-start px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {loading ? "Generating…" : "Get Suggestions"}
          </button>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        {/* Suggestions */}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Suggestions
          </span>
          <div className="min-h-[180px] rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
            {loading ? (
              <div className="flex items-center gap-2 text-gray-400">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Generating…
              </div>
            ) : suggestions.length > 0 ? (
              <div className="space-y-3">
                {suggestions.map((s, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 hover:border-brand-400 dark:hover:border-brand-600 transition-colors cursor-pointer group"
                    onClick={() => handleUseSuggestion(s)}
                  >
                    <div className="text-sm text-gray-700 dark:text-gray-300">{s}</div>
                    <div className="text-xs text-brand-600 dark:text-brand-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      Click to use this suggestion
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-gray-400 dark:text-gray-600">
                Suggestions will appear here…
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
