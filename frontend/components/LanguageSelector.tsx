"use client";

import { TRANSLATION_LANGUAGES } from "@/lib/languages";

interface LanguageSelectorProps {
  label: string;
  value: string;
  onChange: (code: string) => void;
  exclude?: string;
}

export default function LanguageSelector({
  label,
  value,
  onChange,
  exclude,
}: LanguageSelectorProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        {TRANSLATION_LANGUAGES.filter((language) => language.code !== exclude).map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
}
