"use client";

import { useState } from "react";
import TextToSpeech from "./TextToSpeech";

interface OutputDisplayProps {
  text: string;
  label?: string;
  loading?: boolean;
  className?: string;
}

export default function OutputDisplay({
  text,
  label = "Output",
  loading = false,
  className = "",
}: OutputDisplayProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may fail in insecure context — silently ignore */
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</span>
        {text && (
          <button
            onClick={copyToClipboard}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              copied
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            }`}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        )}
      </div>

      <div className="min-h-[240px] whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-4 text-[15px] leading-7 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        {loading ? (
          <div className="flex items-center gap-2 text-gray-400">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Processing…
          </div>
        ) : text ? (
          <span>{text}</span>
        ) : (
          <span className="text-gray-400 dark:text-gray-600">Results will appear here…</span>
        )}
      </div>

      {text && !loading && <TextToSpeech text={text} />}
    </div>
  );
}
