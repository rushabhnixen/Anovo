"use client";

import { useState } from "react";
import TextEditor from "@/components/TextEditor";
import { detectTone, ToneScore } from "@/lib/api";

export default function TonePage() {
  const [inputText, setInputText] = useState("");
  const [tones, setTones] = useState<ToneScore[]>([]);
  const [primaryTone, setPrimaryTone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDetect = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError("");
    setTones([]);
    try {
      const res = await detectTone(inputText);
      setTones(res.tones);
      setPrimaryTone(res.primary_tone);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const toneColors: Record<string, string> = {
    formal: "bg-blue-500",
    casual: "bg-green-500",
    persuasive: "bg-orange-500",
    informative: "bg-cyan-500",
    humorous: "bg-yellow-500",
    sarcastic: "bg-red-500",
    optimistic: "bg-emerald-500",
    pessimistic: "bg-gray-500",
  };

  const toneEmoji: Record<string, string> = {
    formal: "🎩",
    casual: "😎",
    persuasive: "💪",
    informative: "📚",
    humorous: "😂",
    sarcastic: "🙄",
    optimistic: "☀️",
    pessimistic: "🌧️",
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Tone Detector</h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
        Analyze the tone of your text — formal, casual, persuasive, and more.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Input Text
          </label>
          <TextEditor
            value={inputText}
            onChange={setInputText}
            placeholder="Enter or paste text to analyze its tone…"
          />
          <button
            onClick={handleDetect}
            disabled={loading || !inputText.trim()}
            className="self-start px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {loading ? "Analyzing…" : "Detect Tone"}
          </button>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        {/* Results */}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Tone Analysis
          </span>

          <div className="min-h-[180px] rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
            {loading ? (
              <div className="flex items-center gap-2 text-gray-400">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Analyzing…
              </div>
            ) : tones.length > 0 ? (
              <div className="space-y-3">
                {/* Primary tone badge */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">{toneEmoji[primaryTone] ?? "📝"}</span>
                  <span className="text-lg font-semibold capitalize text-gray-800 dark:text-gray-200">
                    {primaryTone}
                  </span>
                </div>

                {/* Tone bars */}
                {tones.map((t) => (
                  <div key={t.label} className="flex items-center gap-2">
                    <span className="w-24 text-xs text-gray-600 dark:text-gray-400 capitalize">
                      {t.label}
                    </span>
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full ${toneColors[t.label] ?? "bg-brand-500"}`}
                        style={{ width: `${Math.round(t.score * 100)}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-xs text-gray-500 dark:text-gray-400">
                      {Math.round(t.score * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-gray-400 dark:text-gray-600">
                Results will appear here…
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
