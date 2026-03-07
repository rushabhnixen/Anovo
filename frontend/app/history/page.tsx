"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { deleteHistoryEntry, getHistory, HistoryEntry } from "@/lib/api";

const TOOL_LABELS: Record<string, string> = {
  paraphrase: "Paraphraser",
  grammar: "Grammar",
  summarize: "Summarizer",
  translate: "Translator",
  humanize: "Humanizer",
  plagiarism: "Plagiarism",
  tone: "Tone Detector",
  cowriter: "Co-Writer",
  chat: "AI Chat",
};

export default function HistoryPage() {
  const { token, user, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getHistory(token)
      .then(setEntries)
      .catch(() => setError("Failed to load history."))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleDelete(id: number) {
    if (!token) return;
    try {
      await deleteHistoryEntry(token, id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch {
      setError("Failed to delete entry.");
    }
  }

  if (authLoading) {
    return (
      <div className="max-w-3xl mx-auto">
        <p className="text-gray-400">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <h2 className="text-lg font-semibold mb-2">Sign in to view your history</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
          Your saved tool results will appear here once you&apos;re signed in.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Register
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">History</h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
        Your recent tool results, saved automatically when you use a tool while signed in.
      </p>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

      {loading && <p className="text-gray-400 text-sm">Loading…</p>}

      {!loading && entries.length === 0 && (
        <div className="text-center py-16 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
          <p className="text-gray-500 dark:text-gray-400 text-sm">No history yet.</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
            Use any tool and your results will be saved here.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300">
                  {TOOL_LABELS[entry.tool] ?? entry.tool}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {new Date(entry.created_at).toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => handleDelete(entry.id)}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                aria-label="Delete entry"
              >
                Delete
              </button>
            </div>
            <div className="px-4 py-3 space-y-2">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Input</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                  {entry.input_text}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Output</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                  {entry.output_text}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
