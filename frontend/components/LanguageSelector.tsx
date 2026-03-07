"use client";

const LANGUAGES = [
  { code: "af", label: "Afrikaans" },
  { code: "ar", label: "Arabic" },
  { code: "bg", label: "Bulgarian" },
  { code: "bn", label: "Bengali" },
  { code: "bs", label: "Bosnian" },
  { code: "ca", label: "Catalan" },
  { code: "cs", label: "Czech" },
  { code: "cy", label: "Welsh" },
  { code: "da", label: "Danish" },
  { code: "de", label: "German" },
  { code: "el", label: "Greek" },
  { code: "en", label: "English" },
  { code: "eo", label: "Esperanto" },
  { code: "es", label: "Spanish" },
  { code: "et", label: "Estonian" },
  { code: "eu", label: "Basque" },
  { code: "fa", label: "Persian" },
  { code: "fi", label: "Finnish" },
  { code: "fr", label: "French" },
  { code: "ga", label: "Irish" },
  { code: "gl", label: "Galician" },
  { code: "he", label: "Hebrew" },
  { code: "hi", label: "Hindi" },
  { code: "hr", label: "Croatian" },
  { code: "hu", label: "Hungarian" },
  { code: "id", label: "Indonesian" },
  { code: "is", label: "Icelandic" },
  { code: "it", label: "Italian" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "lt", label: "Lithuanian" },
  { code: "lv", label: "Latvian" },
  { code: "mk", label: "Macedonian" },
  { code: "ms", label: "Malay" },
  { code: "mt", label: "Maltese" },
  { code: "nb", label: "Norwegian" },
  { code: "nl", label: "Dutch" },
  { code: "pl", label: "Polish" },
  { code: "pt", label: "Portuguese" },
  { code: "ro", label: "Romanian" },
  { code: "ru", label: "Russian" },
  { code: "sk", label: "Slovak" },
  { code: "sl", label: "Slovenian" },
  { code: "sq", label: "Albanian" },
  { code: "sr", label: "Serbian" },
  { code: "sv", label: "Swedish" },
  { code: "th", label: "Thai" },
  { code: "tr", label: "Turkish" },
  { code: "uk", label: "Ukrainian" },
  { code: "vi", label: "Vietnamese" },
  { code: "zh", label: "Chinese" },
];

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
        {LANGUAGES.filter((l) => l.code !== exclude).map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
}
