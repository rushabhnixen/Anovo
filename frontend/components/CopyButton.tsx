"use client";

import { useEffect, useRef, useState } from "react";

interface CopyButtonProps {
  text: string;
  /** Accessible name, e.g. "Copy option 2". Defaults to "Copy". */
  label?: string;
  className?: string;
}

/**
 * Copy-to-clipboard control with transient "Copied" feedback.
 *
 * Used by the AI chat replies and the co-writer suggestions, neither of which
 * previously offered any way to get the generated text out.
 */
export default function CopyButton({ text, label = "Copy", className = "" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear the pending reset if the component unmounts mid-feedback.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard access can be denied (insecure origin, or a WebView without
      // permission). Say nothing rather than showing false success.
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={label}
      className={
        className ||
        "rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      }
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
