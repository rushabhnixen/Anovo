"use client";

import { useEffect, useState } from "react";
import ModelSelector from "@/components/ModelSelector";
import TextEditor from "@/components/TextEditor";
import { coWrite } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const ACTIONS = [
  { id: "continue", label: "Continue", hint: "Natural next sentences" },
  { id: "next_paragraph", label: "Next paragraph", hint: "Develop the argument" },
  { id: "expand", label: "Expand idea", hint: "Add useful detail" },
  { id: "transition", label: "Transition", hint: "Bridge to the next point" },
  { id: "outline", label: "Outline", hint: "Plan what comes next" },
] as const;

const TONES = [
  ["match", "Match my voice"],
  ["professional", "Professional"],
  ["friendly", "Friendly"],
  ["academic", "Academic"],
  ["persuasive", "Persuasive"],
  ["creative", "Creative"],
] as const;

const LENGTHS = {
  short: { label: "Short", tokens: 45 },
  medium: { label: "Paragraph", tokens: 90 },
  long: { label: "Detailed", tokens: 160 },
} as const;

const DRAFT_KEY = "anovo_cowriter_draft_v2";

function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export default function CoWriterPage() {
  const [inputText, setInputText] = useState("");
  const [action, setAction] = useState<(typeof ACTIONS)[number]["id"]>("continue");
  const [tone, setTone] = useState<(typeof TONES)[number][0]>("match");
  const [length, setLength] = useState<keyof typeof LENGTHS>("medium");
  const [numSuggestions, setNumSuggestions] = useState(3);
  const [model, setModel] = useState("standard");
  const [modelUsed, setModelUsed] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const { token, user } = useAuth();

  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) setInputText(savedDraft);
    setDraftReady(true);
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    const saveTimer = window.setTimeout(() => localStorage.setItem(DRAFT_KEY, inputText), 250);
    return () => window.clearTimeout(saveTimer);
  }, [draftReady, inputText]);

  const activeAction = ACTIONS.find((option) => option.id === action) ?? ACTIONS[0];

  const handleGenerate = async () => {
    if (!inputText.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const selectedModel = user?.is_premium ? model : "standard";
      const response = await coWrite(
        inputText,
        LENGTHS[length].tokens,
        numSuggestions,
        action,
        tone,
        selectedModel,
        token ?? undefined,
      );
      setSuggestions(response.suggestions);
      setModelUsed(response.model_used);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const insertSuggestion = (suggestion: string) => {
    const separator = inputText.trim() ? (action === "continue" ? " " : "\n\n") : "";
    setInputText(`${inputText.trimEnd()}${separator}${suggestion}`);
    setSuggestions([]);
  };

  return (
    <div
      className="mx-auto w-full max-w-[1280px] pb-8"
      onKeyDown={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
          event.preventDefault();
          void handleGenerate();
        }
      }}
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">Anovo Co‑Writer</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800">Autosaves locally</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Keep your voice. Get unstuck faster.</h1>
        </div>
        <p className="max-w-md text-xs leading-5 text-slate-500 dark:text-slate-400">
          Choose what should come next, compare distinct options, then insert only the writing you want.
        </p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_55px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/45">
          <div className="no-scrollbar flex gap-1 overflow-x-auto" role="tablist" aria-label="Co-writer action">
            {ACTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={action === option.id}
                title={option.hint}
                onClick={() => setAction(option.id)}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  action === option.id
                    ? "bg-white text-emerald-800 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-emerald-300 dark:ring-slate-700"
                    : "text-slate-500 hover:bg-white/70 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid min-h-[610px] lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,.85fr)]">
          <div className="flex min-h-[500px] flex-col border-b border-slate-200 p-4 lg:border-b-0 lg:border-r dark:border-slate-800 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Your draft</span>
                <span className="ml-2 text-[11px] text-slate-400">{countWords(inputText)} words</span>
              </div>
              <div className="flex gap-1">
                {!inputText ? (
                  <button
                    type="button"
                    onClick={() => setInputText("A successful product launch depends on more than a strong idea. It requires a clear understanding of the people the product is meant to serve.")}
                    className="rounded-md px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950"
                  >
                    Try sample
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setInputText("");
                    setSuggestions([]);
                    localStorage.removeItem(DRAFT_KEY);
                  }}
                  disabled={!inputText}
                  className="rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-900"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="flex-1">
              <TextEditor value={inputText} onChange={setInputText} placeholder="Start writing, paste a draft, or describe the idea you want to develop…" />
            </div>

            <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/45 sm:grid-cols-3">
              <label className="flex flex-col gap-1 text-[11px] font-semibold text-slate-500">
                Voice
                <select value={tone} onChange={(event) => setTone(event.target.value as typeof tone)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                  {TONES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-[11px] font-semibold text-slate-500">
                Length
                <select value={length} onChange={(event) => setLength(event.target.value as keyof typeof LENGTHS)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                  {Object.entries(LENGTHS).map(([value, option]) => <option key={value} value={value}>{option.label}</option>)}
                </select>
              </label>
              <div className="flex flex-col gap-1 text-[11px] font-semibold text-slate-500">
                Options
                <div className="grid h-[34px] grid-cols-3 rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-950">
                  {[1, 3, 5].map((count) => (
                    <button key={count} type="button" onClick={() => setNumSuggestions(count)} className={`rounded-md text-xs ${numSuggestions === count ? "bg-emerald-100 font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "text-slate-500"}`}>{count}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <ModelSelector selectedModel={model} onModelChange={setModel} compact />
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!inputText.trim() || loading}
                className="inline-flex min-w-40 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <span aria-hidden="true">✦</span>}
                {loading ? "Writing…" : activeAction.label}
              </button>
            </div>
          </div>

          <div className="flex min-h-[500px] flex-col bg-slate-50/35 dark:bg-slate-950">
            <div className="flex min-h-12 items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-slate-900">
              <div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Writing options</span>
                <span className="ml-2 text-[11px] text-slate-400">{activeAction.hint}</span>
              </div>
              {suggestions.length ? <button type="button" onClick={handleGenerate} className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400">Regenerate</button> : null}
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
              {loading ? (
                <div className="space-y-3" aria-label="Generating writing options">
                  {[0, 1, 2].map((item) => <div key={item} className="h-28 animate-pulse rounded-xl bg-slate-200/80 dark:bg-slate-800" />)}
                </div>
              ) : suggestions.length ? (
                suggestions.map((suggestion, index) => (
                  <article key={`${suggestion.slice(0, 32)}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-800">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">Option {index + 1}</span>
                      <span className="text-[10px] text-slate-400">{countWords(suggestion)} words</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">{suggestion}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => insertSuggestion(suggestion)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">Insert into draft</button>
                      <button type="button" onClick={() => { setInputText(suggestion); setSuggestions([]); }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Use as new draft</button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="flex min-h-[360px] flex-col items-center justify-center text-center text-slate-400">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-xl text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">✦</div>
                  <p className="font-semibold text-slate-500 dark:text-slate-400">Your next lines will appear here</p>
                  <p className="mt-1 max-w-xs text-xs leading-5">Anovo reads the end of your draft, matches its voice, and gives you distinct directions—not five versions of the same sentence.</p>
                </div>
              )}
            </div>

            <div className="min-h-12 border-t border-slate-100 bg-white px-5 py-3 text-xs text-slate-400 dark:border-slate-900 dark:bg-slate-950">
              {modelUsed && modelUsed !== "standard" ? `Generated with ${modelUsed}` : "Ctrl + Enter to generate · Draft stays on this device"}
            </div>
          </div>
        </div>
      </section>

      {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</div> : null}
    </div>
  );
}
