"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { TRANSLATION_LANGUAGES } from "@/lib/languages";

interface LanguageSelectorProps {
  label: string;
  value: string;
  onChange: (code: string) => void;
  exclude?: string;
  allowAuto?: boolean;
}

export default function LanguageSelector({
  label,
  value,
  onChange,
  exclude,
  allowAuto = false,
}: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const languages = useMemo(() => {
    const options = TRANSLATION_LANGUAGES.filter((language) => language.code !== exclude);
    return allowAuto ? [{ code: "auto", label: "Detect language" }, ...options] : options;
  }, [allowAuto, exclude]);

  const selected = languages.find((language) => language.code === value);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredLanguages = languages.filter((language) => (
    !normalizedQuery
    || language.label.toLocaleLowerCase().includes(normalizedQuery)
    || language.code.toLocaleLowerCase().includes(normalizedQuery)
  ));

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [open]);

  const selectLanguage = (code: string) => {
    onChange(code);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <button
        type="button"
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        onClick={() => {
          setQuery("");
          setOpen((current) => !current);
        }}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left text-xs text-slate-700 transition hover:border-slate-300 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:focus:ring-emerald-950"
      >
        <span className="truncate font-semibold">{selected?.label ?? value}</span>
        <span aria-hidden="true" className={`shrink-0 text-[10px] text-slate-400 transition ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open ? (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-full min-w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-100 p-2 dark:border-slate-800">
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setOpen(false);
                if (event.key === "Enter" && filteredLanguages[0]) {
                  event.preventDefault();
                  selectLanguage(filteredLanguages[0].code);
                }
              }}
              aria-label={`Search ${label.toLocaleLowerCase()}`}
              placeholder="Search languages…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:focus:ring-emerald-950"
            />
          </div>
          <div id={listboxId} role="listbox" aria-label={`${label} options`} className="max-h-56 overflow-y-auto p-1.5">
            {filteredLanguages.length ? filteredLanguages.map((language) => (
              <button
                key={language.code}
                type="button"
                role="option"
                aria-selected={language.code === value}
                onClick={() => selectLanguage(language.code)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition ${
                  language.code === value
                    ? "bg-emerald-50 font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <span>{language.label}</span>
                <span className="text-[10px] uppercase text-slate-400">{language.code === "auto" ? "" : language.code}</span>
              </button>
            )) : (
              <p className="px-3 py-5 text-center text-xs text-slate-400">No languages found</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
