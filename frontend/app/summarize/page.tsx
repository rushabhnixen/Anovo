"use client";

import { useState } from "react";
import TextEditor from "@/components/TextEditor";
import OutputDisplay from "@/components/OutputDisplay";
import { summarizeText, saveHistory } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function SummarizePage() {
  const [inputText, setInputText] = useState("");
  const [mode, setMode] = useState<"paragraph" | "bullet">("paragraph");
  const [maxLength, setMaxLength] = useState(150);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { token } = useAuth();

  const handleSummarize = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await summarizeText(inputText, mode, maxLength);
      setOutput(res.summary);
      if (token) saveHistory(token, "summarize", inputText, res.summary).catch(() => {});
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Summarizer</h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
        Condense long texts using BART/PEGASUS. Choose paragraph or bullet-point output.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Input Text
          </label>
          <TextEditor value={inputText} onChange={setInputText} placeholder="Paste the text you want to summarize…" />

          {/* Controls */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Mode</label>
              <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700">
                {(["paragraph", "bullet"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`px-3 py-1.5 text-sm capitalize transition-colors ${
                      mode === m
                        ? "bg-brand-600 text-white"
                        : "bg-white dark:bg-gray-950 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Max length: {maxLength} tokens
              </label>
              <input
                type="range"
                min={30}
                max={500}
                step={10}
                value={maxLength}
                onChange={(e) => setMaxLength(Number(e.target.value))}
                className="accent-brand-600"
              />
            </div>
          </div>

          <button
            onClick={handleSummarize}
            disabled={loading || !inputText.trim()}
            className="self-start px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {loading ? "Summarizing…" : "Summarize"}
          </button>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        {/* Output */}
        <OutputDisplay text={output} label="Summary" loading={loading} />
      </div>
    </div>
  );
}
