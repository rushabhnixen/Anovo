"use client";

import { useAuth } from "@/lib/auth-context";

interface PremiumToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export default function PremiumToggle({ enabled, onChange }: PremiumToggleProps) {
  const { user } = useAuth();

  if (!user) return null;

  if (!user.is_premium) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span>
          Enter a promo code in the navbar to unlock{" "}
          <span className="text-amber-600 dark:text-amber-400 font-medium">Premium mode</span>
          {" "}(Llama 405B)
        </span>
      </div>
    );
  }

  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div className="relative inline-flex items-center">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-9 h-5 rounded-full bg-gray-300 dark:bg-gray-700 peer-checked:bg-amber-500 transition-colors" />
        <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </div>
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
        Premium mode
        <span className="ml-1 text-amber-600 dark:text-amber-400">(Llama 405B)</span>
      </span>
    </label>
  );
}
