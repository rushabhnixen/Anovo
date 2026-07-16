"use client";

import { useMemo, useRef, useState } from "react";
import ModelSelector from "./ModelSelector";
import SynonymSlider from "./SynonymSlider";
import {
  ParaphraseMode,
  paraphraseText,
  refineParaphrase,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const MODES: Array<{ id: ParaphraseMode; label: string; hint: string }> = [
  { id: "standard", label: "Standard", hint: "Balanced rewriting" },
  { id: "fluency", label: "Fluency", hint: "Clear and natural" },
  { id: "humanize", label: "Humanize", hint: "Authentic voice" },
  { id: "formal", label: "Formal", hint: "Professional tone" },
  { id: "simple", label: "Simple", hint: "Easy to understand" },
  { id: "creative", label: "Creative", hint: "Fresh expression" },
  { id: "academic", label: "Academic", hint: "Scholarly style" },
  { id: "expand", label: "Expand", hint: "Add useful detail" },
  { id: "shorten", label: "Shorten", hint: "More concise" },
];

interface SentenceSegment {
  text: string;
  start: number;
  end: number;
}

type ActiveSelection =
  | { kind: "sentence"; sentenceIndex: number }
  | { kind: "word"; sentenceIndex: number; word: string; start: number; end: number };

function getSentenceSegments(text: string): SentenceSegment[] {
  const matches = text.matchAll(/[^.!?\n]+(?:[.!?]+(?=\s|$)|$)/g);
  const segments: SentenceSegment[] = [];

  for (const match of matches) {
    const raw = match[0];
    const trimmed = raw.trim();
    if (!trimmed || match.index === undefined) continue;
    const leading = raw.length - raw.trimStart().length;
    const trailing = raw.length - raw.trimEnd().length;
    const start = match.index + leading;
    const end = match.index + raw.length - trailing;
    segments.push({ text: text.slice(start, end), start, end });
  }

  if (!segments.length && text.trim()) {
    const start = text.indexOf(text.trim());
    segments.push({ text: text.trim(), start, end: start + text.trim().length });
  }
  return segments;
}

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function normaliseWord(word: string) {
  return word.toLocaleLowerCase().replace(/[’']/g, "'");
}

export default function ParaphraseWorkspace() {
  const [inputText, setInputText] = useState("");
  const [output, setOutput] = useState("");
  const [intensity, setIntensity] = useState(3);
  const [writingMode, setWritingMode] = useState<ParaphraseMode>("standard");
  const [model, setModel] = useState("standard");
  const [modelUsed, setModelUsed] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeSelection, setActiveSelection] = useState<ActiveSelection | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [refineError, setRefineError] = useState("");
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const requestId = useRef(0);
  const suggestionCache = useRef(new Map<string, string[]>());
  const { token } = useAuth();

  const sentences = useMemo(() => getSentenceSegments(output), [output]);
  const originalWords = useMemo(() => {
    const words = inputText.match(/[\p{L}\p{N}]+(?:[’'][\p{L}\p{N}]+)*/gu) ?? [];
    return new Set(words.map(normaliseWord));
  }, [inputText]);

  const fetchSuggestions = async (
    fullText: string,
    selection: ActiveSelection,
    selectedText: string,
  ) => {
    setActiveSelection(selection);
    setRefineError("");
    const cacheKey = `${selection.kind}:${writingMode}:${intensity}:${selectedText}:${fullText}`;
    const cached = suggestionCache.current.get(cacheKey);
    if (cached) {
      setSuggestions(cached);
      setSuggestionLoading(false);
      return;
    }

    const currentRequest = ++requestId.current;
    setSuggestions([]);
    setSuggestionLoading(true);
    try {
      const response = await refineParaphrase(
        fullText,
        selectedText,
        selection.kind,
        writingMode,
        intensity,
        5,
      );
      if (currentRequest !== requestId.current) return;
      suggestionCache.current.set(cacheKey, response.suggestions);
      setSuggestions(response.suggestions);
    } catch (caught) {
      if (currentRequest !== requestId.current) return;
      setRefineError((caught as Error).message);
    } finally {
      if (currentRequest === requestId.current) setSuggestionLoading(false);
    }
  };

  const selectSentence = (sentenceIndex: number, fullText = output) => {
    const currentSentences = getSentenceSegments(fullText);
    const sentence = currentSentences[sentenceIndex];
    if (!sentence) return;
    void fetchSuggestions(
      fullText,
      { kind: "sentence", sentenceIndex },
      sentence.text,
    );
  };

  const selectWord = (
    event: React.MouseEvent<HTMLButtonElement>,
    sentenceIndex: number,
    word: string,
    start: number,
    end: number,
  ) => {
    event.stopPropagation();
    void fetchSuggestions(
      output,
      { kind: "word", sentenceIndex, word, start, end },
      word,
    );
  };

  const handleParaphrase = async () => {
    if (!inputText.trim() || loading) return;
    setLoading(true);
    setError("");
    setRefineError("");
    setModelUsed("");
    setActiveSelection(null);
    setSuggestions([]);
    setUndoStack([]);
    setRedoStack([]);
    suggestionCache.current.clear();

    try {
      const response = await paraphraseText(
        inputText,
        intensity,
        model,
        token ?? undefined,
        writingMode,
      );
      setOutput(response.paraphrased);
      setModelUsed(response.model_used ?? "standard");
      const firstSentence = getSentenceSegments(response.paraphrased)[0];
      if (firstSentence) {
        void fetchSuggestions(
          response.paraphrased,
          { kind: "sentence", sentenceIndex: 0 },
          firstSentence.text,
        );
      }
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const commitOutput = (nextOutput: string) => {
    if (nextOutput === output) return;
    setUndoStack((stack) => [...stack, output]);
    setRedoStack([]);
    setOutput(nextOutput);
    setSuggestions([]);
    setActiveSelection(null);
  };

  const applySuggestion = (suggestion: string) => {
    if (!activeSelection) return;
    if (activeSelection.kind === "word") {
      const { start, end } = activeSelection;
      commitOutput(`${output.slice(0, start)}${suggestion}${output.slice(end)}`);
      return;
    }

    const sentence = sentences[activeSelection.sentenceIndex];
    if (!sentence) return;
    commitOutput(`${output.slice(0, sentence.start)}${suggestion}${output.slice(sentence.end)}`);
  };

  const undo = () => {
    const previous = undoStack[undoStack.length - 1];
    if (previous === undefined) return;
    setRedoStack((stack) => [output, ...stack]);
    setUndoStack((stack) => stack.slice(0, -1));
    setOutput(previous);
    setActiveSelection(null);
    setSuggestions([]);
  };

  const redo = () => {
    const next = redoStack[0];
    if (next === undefined) return;
    setUndoStack((stack) => [...stack, output]);
    setRedoStack((stack) => stack.slice(1));
    setOutput(next);
    setActiveSelection(null);
    setSuggestions([]);
  };

  const pasteText = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setInputText(text);
    } catch {
      setError("Clipboard access is blocked. Paste into the editor with Ctrl+V.");
    }
  };

  const copyOutput = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Could not copy the result to your clipboard.");
    }
  };

  const renderSentence = (sentence: SentenceSegment, sentenceIndex: number) => {
    const tokens = Array.from(
      sentence.text.matchAll(/[\p{L}\p{N}]+(?:[’'][\p{L}\p{N}]+)*|[^\p{L}\p{N}]+/gu),
    );
    const isSelected = activeSelection?.sentenceIndex === sentenceIndex;

    return (
      <span
        key={`${sentence.start}-${sentence.end}`}
        onClick={() => selectSentence(sentenceIndex)}
        className={`group/sentence rounded px-0.5 transition-colors cursor-pointer ${
          isSelected ? "bg-emerald-50 dark:bg-emerald-950/60" : "hover:bg-gray-100 dark:hover:bg-gray-800"
        }`}
      >
        {tokens.map((token, tokenIndex) => {
          const value = token[0];
          const localStart = token.index ?? 0;
          const isWord = /^[\p{L}\p{N}]/u.test(value);
          if (!isWord) return <span key={tokenIndex}>{value}</span>;
          const absoluteStart = sentence.start + localStart;
          const changed = !originalWords.has(normaliseWord(value));
          const selectedWord = activeSelection?.kind === "word"
            && activeSelection.start === absoluteStart;
          return (
            <button
              type="button"
              key={`${absoluteStart}-${value}`}
              onClick={(event) => selectWord(
                event,
                sentenceIndex,
                value,
                absoluteStart,
                absoluteStart + value.length,
              )}
              className={`rounded-sm px-px leading-7 transition-colors ${
                selectedWord
                  ? "bg-emerald-200 text-emerald-950 dark:bg-emerald-700 dark:text-white"
                  : changed
                    ? "text-emerald-800 underline decoration-emerald-500 decoration-2 underline-offset-4 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900"
                    : "hover:bg-emerald-100 dark:hover:bg-emerald-900"
              }`}
              title={`See alternatives for “${value}”`}
            >
              {value}
            </button>
          );
        })}
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); selectSentence(sentenceIndex); }}
          className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded text-xs text-emerald-600 opacity-0 transition-opacity hover:bg-emerald-100 focus:opacity-100 group-hover/sentence:opacity-100 dark:text-emerald-400 dark:hover:bg-emerald-900"
          aria-label={`Show alternatives for sentence ${sentenceIndex + 1}`}
          title="Show sentence alternatives"
        >
          ↻
        </button>
      </span>
    );
  };

  return (
    <div className="mx-auto max-w-[1180px] pb-10">
      <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-950 dark:text-white">Paraphraser</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Rewrite precisely, then fine-tune any sentence or word.
          </p>
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 sm:mt-0">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Context-aware suggestions
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.07)] dark:border-gray-800 dark:bg-gray-950">
        <div className="border-b border-gray-200 px-3 pt-3 dark:border-gray-800 sm:px-5">
          <div className="flex gap-1 overflow-x-auto pb-3" role="tablist" aria-label="Paraphrase mode">
            {MODES.map((modeOption) => (
              <button
                key={modeOption.id}
                type="button"
                role="tab"
                aria-selected={writingMode === modeOption.id}
                title={modeOption.hint}
                onClick={() => setWritingMode(modeOption.id)}
                className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  writingMode === modeOption.id
                    ? "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-800"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-900"
                }`}
              >
                {modeOption.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid min-h-[520px] lg:grid-cols-2">
          <div className="flex min-h-[430px] flex-col border-b border-gray-200 lg:border-b-0 lg:border-r dark:border-gray-800">
            <div className="flex h-12 items-center justify-between border-b border-gray-100 px-5 dark:border-gray-900">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Original text</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={pasteText}
                  className="rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-900"
                >
                  Paste
                </button>
                {inputText && (
                  <button
                    type="button"
                    onClick={() => { setInputText(""); setOutput(""); }}
                    className="rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-900"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <textarea
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                  event.preventDefault();
                  void handleParaphrase();
                }
              }}
              placeholder="Enter or paste the text you want to rewrite…"
              className="min-h-[300px] flex-1 resize-none bg-transparent px-5 py-5 text-[15px] leading-7 text-gray-800 outline-none placeholder:text-gray-400 dark:text-gray-200"
              maxLength={10000}
              aria-label="Text to paraphrase"
            />

            <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-900">
              <div className="mb-4">
                <SynonymSlider value={intensity} onChange={setIntensity} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs tabular-nums text-gray-400">
                  {wordCount(inputText)} words · {inputText.length.toLocaleString()} / 10,000
                </span>
                <button
                  type="button"
                  onClick={handleParaphrase}
                  disabled={!inputText.trim() || loading}
                  className="inline-flex min-w-32 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {loading && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  )}
                  {loading ? "Rewriting…" : output ? "Rephrase" : "Paraphrase"}
                </button>
              </div>
            </div>
          </div>

          <div className="flex min-h-[520px] flex-col bg-gray-50/40 dark:bg-gray-950">
            <div className="flex h-12 items-center justify-between border-b border-gray-100 px-5 dark:border-gray-900">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Paraphrased text</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={undo}
                  disabled={!undoStack.length}
                  aria-label="Undo replacement"
                  className="rounded-md p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-900"
                >
                  ↶
                </button>
                <button
                  type="button"
                  onClick={redo}
                  disabled={!redoStack.length}
                  aria-label="Redo replacement"
                  className="rounded-md p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-900"
                >
                  ↷
                </button>
                <button
                  type="button"
                  onClick={copyOutput}
                  disabled={!output}
                  className="rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-900"
                >
                  {copied ? "Copied" : "Copy all"}
                </button>
              </div>
            </div>

            <div className="min-h-[270px] flex-1 px-5 py-5 text-[15px] leading-7 text-gray-800 dark:text-gray-200">
              {loading ? (
                <div className="space-y-3 pt-1" aria-label="Generating paraphrase">
                  <div className="h-4 w-11/12 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                  <div className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                  <div className="h-4 w-8/12 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                </div>
              ) : output ? (
                <div className="whitespace-pre-wrap">
                  {sentences.map((sentence, sentenceIndex) => {
                    const previousEnd = sentenceIndex === 0 ? 0 : sentences[sentenceIndex - 1].end;
                    const gap = output.slice(previousEnd, sentence.start);
                    return (
                      <span key={`${sentence.start}-wrapper`}>
                        {gap}
                        {renderSentence(sentence, sentenceIndex)}
                      </span>
                    );
                  })}
                  {output.slice(sentences[sentences.length - 1]?.end ?? 0)}
                </div>
              ) : (
                <div className="flex h-full min-h-[220px] flex-col items-center justify-center text-center text-gray-400">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-xl text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">✦</div>
                  <p className="font-medium text-gray-500 dark:text-gray-400">Your rewrite will appear here</p>
                  <p className="mt-1 max-w-xs text-xs leading-5">Click a sentence for complete rewrites or any word for contextual alternatives.</p>
                </div>
              )}
            </div>

            {output && (
              <div className="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                <div className="flex h-11 items-center justify-between px-5 text-xs text-gray-500">
                  <span>{wordCount(output)} words</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Previous sentence"
                      disabled={!activeSelection || activeSelection.sentenceIndex <= 0}
                      onClick={() => activeSelection && selectSentence(activeSelection.sentenceIndex - 1)}
                      className="rounded p-1 text-base hover:bg-gray-100 disabled:opacity-25 dark:hover:bg-gray-900"
                    >
                      ‹
                    </button>
                    <span className="min-w-20 text-center tabular-nums">
                      {activeSelection ? activeSelection.sentenceIndex + 1 : 0} / {sentences.length} sentences
                    </span>
                    <button
                      type="button"
                      aria-label="Next sentence"
                      disabled={!activeSelection || activeSelection.sentenceIndex >= sentences.length - 1}
                      onClick={() => activeSelection && selectSentence(activeSelection.sentenceIndex + 1)}
                      className="rounded p-1 text-base hover:bg-gray-100 disabled:opacity-25 dark:hover:bg-gray-900"
                    >
                      ›
                    </button>
                  </div>
                </div>

                {activeSelection && (
                  <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-900" aria-live="polite">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                          {activeSelection.kind === "word"
                            ? `Replace “${activeSelection.word}”`
                            : "Sentence options"}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-400">
                          {activeSelection.kind === "word"
                            ? "Suggestions fit this sentence and its grammar."
                            : "Choose a version to replace only this sentence."}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { requestId.current += 1; setActiveSelection(null); setSuggestions([]); }}
                        aria-label="Close suggestions"
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900"
                      >
                        ×
                      </button>
                    </div>

                    {suggestionLoading ? (
                      <div className="space-y-2">
                        {[0, 1, 2].map((item) => (
                          <div key={item} className="h-9 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-900" />
                        ))}
                      </div>
                    ) : refineError ? (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                        Could not load alternatives: {refineError}
                      </div>
                    ) : activeSelection.kind === "word" ? (
                      <div className="flex flex-wrap gap-2">
                        {suggestions.map((suggestion) => (
                          <button
                            type="button"
                            key={suggestion}
                            onClick={() => applySuggestion(suggestion)}
                            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-950"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                        {suggestions.map((suggestion, index) => (
                          <button
                            type="button"
                            key={suggestion}
                            onClick={() => applySuggestion(suggestion)}
                            className="group flex w-full gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left text-sm leading-5 text-gray-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/50"
                          >
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-500 group-hover:bg-emerald-100 group-hover:text-emerald-700 dark:bg-gray-800">{index + 1}</span>
                            <span>{suggestion}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {!suggestionLoading && !refineError && !suggestions.length && (
                      <p className="text-xs text-gray-400">No distinct alternatives were returned. Try another mode or strength.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4 border-t border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-800 dark:bg-gray-900/50 md:grid-cols-[1fr_280px] md:items-center">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <span><span className="mr-1.5 inline-block h-0.5 w-4 bg-emerald-500 align-middle" />Changed words are underlined</span>
            <span>Click a word or sentence to refine it</span>
            <span>Ctrl + Enter to paraphrase</span>
          </div>
          <ModelSelector selectedModel={model} onModelChange={setModel} />
        </div>
      </section>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {modelUsed && modelUsed !== "standard" && output && (
        <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-400">Processed with {modelUsed}</p>
      )}
      {modelUsed === "standard" && model !== "standard" && output && (
        <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">Premium model unavailable — processed with the standard model.</p>
      )}
    </div>
  );
}
