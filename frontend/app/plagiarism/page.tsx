"use client";

import { useState } from "react";
import TextEditor from "@/components/TextEditor";
import { checkPlagiarism } from "@/lib/api";

export default function PlagiarismPage() {
  const [inputText, setInputText] = useState("");
  const [referenceText, setReferenceText] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [isPlagiarized, setIsPlagiarized] = useState(false);
  const [threshold, setThreshold] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCheck = async () => {
    if (!inputText.trim() || !referenceText.trim()) return;
    setLoading(true);
    setError("");
    setScore(null);
    try {
      const res = await checkPlagiarism(inputText, referenceText);
      setScore(res.similarity_score);
      setIsPlagiarized(res.is_plagiarized);
      setThreshold(res.threshold);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const scorePercent = score !== null ? Math.round(score * 100) : 0;
  const scoreColor =
    score === null
      ? "text-gray-400"
      : score >= 0.8
        ? "text-red-500"
        : score >= 0.5
          ? "text-yellow-500"
          : "text-green-500";

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Plagiarism Checker</h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
        Compare two texts using semantic similarity to detect potential plagiarism.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Text to check */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Text to Check
          </label>
          <TextEditor
            value={inputText}
            onChange={setInputText}
            placeholder="Paste the text you want to check…"
          />
        </div>

        {/* Reference text */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Reference Text
          </label>
          <TextEditor
            value={referenceText}
            onChange={setReferenceText}
            placeholder="Paste the original/reference text…"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <button
          onClick={handleCheck}
          disabled={loading || !inputText.trim() || !referenceText.trim()}
          className="self-start px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {loading ? "Checking…" : "Check Plagiarism"}
        </button>
        {error && <p className="text-red-500 text-sm">{error}</p>}

        {score !== null && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className={`text-4xl font-bold ${scoreColor}`}>
                {scorePercent}%
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Similarity Score
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Threshold: {Math.round(threshold * 100)}%
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  isPlagiarized ? "bg-red-500" : score >= 0.5 ? "bg-yellow-500" : "bg-green-500"
                }`}
                style={{ width: `${scorePercent}%` }}
              />
            </div>

            <div
              className={`text-sm font-medium ${
                isPlagiarized ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
              }`}
            >
              {isPlagiarized
                ? "⚠️ Potential plagiarism detected — high semantic similarity."
                : "✅ Low similarity — text appears original."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
