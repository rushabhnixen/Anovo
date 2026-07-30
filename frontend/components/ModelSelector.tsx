"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export const WRITING_MODELS = [
  { value: "standard", label: "Anovo Fast", detail: "Fast everyday writing", badge: "Free" },
  { value: "gpt-4o", label: "GPT-4o", detail: "Best all-round quality", badge: "Pro" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini", detail: "Fast and precise", badge: "Pro" },
  { value: "Meta-Llama-3.1-405B-Instruct", label: "Llama 405B", detail: "Deep rewriting", badge: "Pro" },
  { value: "Llama-3.3-70B-Instruct", label: "Llama 3.3 70B", detail: "Strong natural voice", badge: "Pro" },
  { value: "Meta-Llama-3.1-8B-Instruct", label: "Llama 8B", detail: "Fast open model", badge: "Pro" },
  { value: "Phi-4", label: "Phi-4", detail: "Concise reasoning", badge: "Pro" },
  { value: "DeepSeek-R1", label: "DeepSeek R1", detail: "Structured reasoning", badge: "Pro" },
  { value: "Cohere-command-r-plus-08-2024", label: "Command R+", detail: "Long-form control", badge: "Pro" },
] as const;

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  compareEnabled?: boolean;
  onCompareChange?: (enabled: boolean) => void;
  compact?: boolean;
}

export default function ModelSelector({
  selectedModel,
  onModelChange,
  compareEnabled = false,
  onCompareChange,
  compact = false,
}: ModelSelectorProps) {
  const { user } = useAuth();
  const isPremium = Boolean(user?.is_premium);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? "" : "justify-end"}`}>
      <div className="relative">
        <label htmlFor="workspace-model" className="sr-only">Writing model</label>
        <select
          id="workspace-model"
          value={isPremium ? selectedModel : "standard"}
          onChange={(event) => onModelChange(event.target.value)}
          className="h-9 max-w-[190px] appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-xs font-semibold text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:ring-emerald-950"
        >
          {WRITING_MODELS.map((model) => (
            <option
              key={model.value}
              value={model.value}
              disabled={!isPremium && model.value !== "standard"}
            >
              {model.label}{model.value === "standard" ? "" : " · PRO"}
            </option>
          ))}
        </select>
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </div>

      {isPremium && selectedModel !== "standard" && onCompareChange ? (
        <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 text-[11px] font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300">
          <input
            type="checkbox"
            checked={compareEnabled}
            onChange={(event) => onCompareChange(event.target.checked)}
            className="h-3.5 w-3.5 accent-amber-600"
          />
          Compare with Fast
        </label>
      ) : null}

      {!isPremium ? (
        <Link
          href={user ? "/account" : "/register"}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-3 text-[11px] font-bold text-white shadow-sm transition hover:from-amber-600 hover:to-orange-600"
        >
          <span aria-hidden="true">✦</span>
          Unlock 8 PRO models
        </Link>
      ) : (
        <span className="rounded-md bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          PRO
        </span>
      )}
    </div>
  );
}
