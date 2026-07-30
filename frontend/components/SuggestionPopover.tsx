"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface SuggestionPopoverProps {
  kind: "sentence" | "word";
  label: string;
  suggestions: string[];
  loading: boolean;
  error: string;
  position: { top: number; left: number };
  onApply: (suggestion: string) => void;
  onClose: () => void;
}

export default function SuggestionPopover({
  kind,
  label,
  suggestions,
  loading,
  error,
  position,
  onApply,
  onClose,
}: SuggestionPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!popoverRef.current?.contains(event.target as Node)) onClose();
    };
    const closeOnViewportMove = () => onClose();

    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("mousedown", closeOnOutsideClick);
    window.addEventListener("resize", closeOnViewportMove);
    window.addEventListener("scroll", closeOnViewportMove, true);

    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("mousedown", closeOnOutsideClick);
      window.removeEventListener("resize", closeOnViewportMove);
      window.removeEventListener("scroll", closeOnViewportMove, true);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={kind === "word" ? `Alternatives for ${label}` : "Sentence alternatives"}
      className="fixed z-[90] w-[min(380px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_22px_70px_rgba(15,23,42,0.22)] dark:border-slate-700 dark:bg-slate-900"
      style={{ top: position.top, left: position.left }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              {kind === "word" ? "Word" : "Sentence"}
            </span>
            <span className="text-xs text-slate-400">Context-aware</span>
          </div>
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
            {kind === "word" ? `Replace “${label}”` : "Choose another phrasing"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close alternatives"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          ×
        </button>
      </div>

      <div className="max-h-[min(360px,55vh)] overflow-y-auto p-2" aria-live="polite">
        {loading ? (
          <div className="space-y-2 p-1">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-11 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : error ? (
          <div className="m-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
            Could not load alternatives: {error}
          </div>
        ) : suggestions.length ? (
          <div className={kind === "word" ? "flex flex-wrap gap-2 p-1" : "space-y-1"}>
            {suggestions.map((suggestion, index) => (
              <button
                type="button"
                key={`${index}-${suggestion}`}
                onClick={() => onApply(suggestion)}
                className={
                  kind === "word"
                    ? "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-emerald-700 dark:hover:bg-emerald-950"
                    : "group flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left text-sm leading-5 text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-950 dark:text-slate-200 dark:hover:bg-emerald-950 dark:hover:text-emerald-100"
                }
              >
                {kind === "sentence" ? (
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 group-hover:bg-emerald-200 group-hover:text-emerald-800 dark:bg-slate-800 dark:text-slate-300">
                    {index + 1}
                  </span>
                ) : null}
                <span>{suggestion}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="px-3 py-4 text-center text-xs leading-5 text-slate-400">
            No distinct alternatives were returned. Try another mode or strength.
          </p>
        )}
      </div>

      <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-400 dark:border-slate-800 dark:bg-slate-950/70">
        Select an option to replace only this {kind}.
      </div>
    </div>,
    document.body,
  );
}
