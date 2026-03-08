"use client";

import { useAuth } from "@/lib/auth-context";

const MODELS = [
  { value: "standard", label: "Standard (Groq)" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "Meta-Llama-3.1-405B-Instruct", label: "Llama 405B" },
  { value: "Mistral-large-2407", label: "Mistral Large" },
  { value: "Meta-Llama-3.1-70B-Instruct", label: "Llama 70B" },
];

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
}

export default function ModelSelector({ selectedModel, onModelChange }: ModelSelectorProps) {
  const { user } = useAuth();

  if (!user) return null;

  if (!user.is_premium) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 py-1">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span>Premium models — enter promo code to unlock</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 py-1">
      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Model:</label>
      <select
        value={selectedModel}
        onChange={(e) => onModelChange(e.target.value)}
        className="text-xs rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-300 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500"
      >
        {MODELS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
      {selectedModel !== "standard" && (
        <span className="text-xs px-1.5 py-0.5 rounded bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 font-medium">
          Premium
        </span>
      )}
    </div>
  );
}
