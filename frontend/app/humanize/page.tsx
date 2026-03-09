"use client";

import { useState } from "react";
import TextEditor from "@/components/TextEditor";
import OutputDisplay from "@/components/OutputDisplay";
import ModelSelector from "@/components/ModelSelector";
import { humanizeText } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function HumanizePage() {
  const [inputText, setInputText] = useState("");
  const [output, setOutput] = useState("");
  const [modelUsed, setModelUsed] = useState("");
  const [steps, setSteps] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSteps, setShowSteps] = useState(false);
  const [model, setModel] = useState("standard");
  const { token } = useAuth();

  const handleHumanize = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError("");
    setSteps(null);
    setModelUsed("");
    try {
      const res = await humanizeText(inputText, model, token ?? undefined);
      setOutput(res.humanized);
      setSteps(res.steps ?? null);
      setModelUsed(res.model_used ?? "standard");
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
        Supports long texts — large documents are automatically chunked and processed section by section.
      </p>
      <div className="flex flex-wrap gap-2 mb-6 text-xs text-gray-500 dark:text-gray-400">
        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full">Sentence Variation</span>
        <span>+</span>
        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full">Natural Vocabulary</span>
        <span>+</span>
        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full">Human Voice</span>
        <span>+</span>
        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full">AI Detection Bypass</span>
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
          <ModelSelector selectedModel={model} onModelChange={setModel} />
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

          {modelUsed && modelUsed !== "standard" && output && (
            <p className="text-xs text-brand-600 dark:text-brand-400">
              Processed with {modelUsed}
            </p>
          )}
          {modelUsed === "standard" && model !== "standard" && output && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Premium model unavailable — processed with standard model
            </p>
          )}

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
