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
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        {text && (
          <button
            onClick={copyToClipboard}
            className={`text-xs px-2 py-1 rounded-md transition-colors ${
              copied
                ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        )}
      </div>

      <div className="min-h-[180px] rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3 text-sm whitespace-pre-wrap">
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
