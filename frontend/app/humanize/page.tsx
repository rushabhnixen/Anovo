"use client";

import { useState } from "react";
import TextEditor from "@/components/TextEditor";
import OutputDisplay from "@/components/OutputDisplay";
import { humanizeText } from "@/lib/api";

export default function HumanizePage() {
  const [inputText, setInputText] = useState("");
  const [output, setOutput] = useState("");
  const [steps, setSteps] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSteps, setShowSteps] = useState(false);

  const handleHumanize = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError("");
    setSteps(null);
    try {
      const res = await humanizeText(inputText);
      setOutput(res.humanized);
      setSteps(res.steps ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">AI Text Humanizer</h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">
        Transform AI-generated text into natural, human-sounding writing.
      </p>
      <div className="flex flex-wrap gap-2 mb-6 text-xs text-gray-500 dark:text-gray-400">
        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full">1. Paraphrase</span>
        <span>→</span>
        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full">2. Back-Translation</span>
        <span>→</span>
        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full">3. Burstiness Modulation</span>
        <span>→</span>
        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full">4. Human Heuristics</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            AI-Generated Text
          </label>
          <TextEditor
            value={inputText}
            onChange={setInputText}
            placeholder="Paste AI-generated text to humanize…"
          />
          <button
            onClick={handleHumanize}
            disabled={loading || !inputText.trim()}
            className="self-start px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {loading ? "Humanizing…" : "Humanize"}
          </button>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        <div className="flex flex-col gap-3">
          <OutputDisplay text={output} label="Humanized Text" loading={loading} />

          {steps && (
            <div>
              <button
                onClick={() => setShowSteps((s) => !s)}
                className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
              >
                {showSteps ? "Hide" : "Show"} pipeline steps
              </button>
              {showSteps && (
                <div className="mt-2 space-y-2 text-xs">
                  {Object.entries(steps).map(([key, val]) => (
                    <div key={key} className="p-2 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="font-medium text-gray-600 dark:text-gray-400 capitalize mb-1">
                        {key.replace(/_/g, " ")}
                      </div>
                      <div className="text-gray-700 dark:text-gray-300">{val}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
