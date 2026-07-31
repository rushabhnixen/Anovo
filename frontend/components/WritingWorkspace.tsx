"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  GrammarError,
  ParaphraseMode,
  checkGrammar,
  detectTone,
  downloadProcessedDoc,
  extractDocument,
  humanizeText,
  paraphraseText,
  refineParaphrase,
  summarizeText,
  translateText,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { TRANSLATION_LANGUAGES } from "@/lib/languages";
import ModelSelector from "./ModelSelector";
import SuggestionPopover from "./SuggestionPopover";
import SynonymSlider from "./SynonymSlider";

export type WorkspaceTool =
  | "paraphrase"
  | "humanize"
  | "grammar"
  | "summarize"
  | "translate"
  | "tone";

const TOOLS: Array<{
  id: WorkspaceTool;
  label: string;
  verb: string;
  loadingLabel: string;
  outputLabel: string;
  icon: string;
  description: string;
}> = [
  { id: "paraphrase", label: "Paraphrase", verb: "Paraphrase", loadingLabel: "Paraphrasing…", outputLabel: "Paraphrased text", icon: "↻", description: "Rewrite with precise control" },
  { id: "humanize", label: "Humanize", verb: "Humanize", loadingLabel: "Humanizing…", outputLabel: "Humanized text", icon: "✦", description: "Make AI text sound natural" },
  { id: "grammar", label: "Grammar", verb: "Check text", loadingLabel: "Checking…", outputLabel: "Corrected text", icon: "✓", description: "Fix grammar and spelling" },
  { id: "summarize", label: "Summarize", verb: "Summarize", loadingLabel: "Summarizing…", outputLabel: "Summary", icon: "≡", description: "Condense the key ideas" },
  { id: "translate", label: "Translate", verb: "Translate", loadingLabel: "Translating…", outputLabel: "Translation", icon: "文", description: "Translate into another language" },
  { id: "tone", label: "Tone", verb: "Analyze tone", loadingLabel: "Analyzing…", outputLabel: "Tone analysis", icon: "◒", description: "Understand how writing sounds" },
];

const MODES: Array<{ id: ParaphraseMode; label: string; hint: string }> = [
  { id: "standard", label: "Standard", hint: "Balanced rewriting" },
  { id: "fluency", label: "Fluency", hint: "Clear and natural" },
  { id: "humanize", label: "Humanize", hint: "Authentic voice" },
  { id: "formal", label: "Formal", hint: "Professional tone" },
  { id: "simple", label: "Simple", hint: "Easy to understand" },
  { id: "creative", label: "Creative", hint: "Fresh expression" },
  { id: "academic", label: "Academic", hint: "Scholarly style" },
  { id: "expand", label: "Expand", hint: "Add useful detail" },
  { id: "shorten", label: "Shorten", hint: "Make it concise" },
];

interface SentenceSegment {
  text: string;
  start: number;
  end: number;
}

type ActiveSelection =
  | { kind: "sentence"; sentenceIndex: number }
  | { kind: "word"; sentenceIndex: number; word: string; start: number; end: number };

interface ProcessResult {
  text: string;
  modelUsed?: string;
  meta?: string;
}

interface WritingWorkspaceProps {
  initialTool?: WorkspaceTool;
}

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

function applyGrammarFixes(text: string, errors: GrammarError[]) {
  return [...errors]
    .sort((a, b) => b.offset - a.offset)
    .reduce((current, issue) => {
      const replacement = issue.replacements[0];
      if (!replacement) return current;
      return `${current.slice(0, issue.offset)}${replacement}${current.slice(issue.offset + issue.length)}`;
    }, text);
}

function getPopoverPosition(clientX: number, clientY: number, kind: ActiveSelection["kind"]) {
  const width = Math.min(380, window.innerWidth - 24);
  const estimatedHeight = kind === "word" ? 210 : 330;
  const left = Math.min(Math.max(12, clientX - 24), window.innerWidth - width - 12);
  const below = clientY + 14;
  const top = below + estimatedHeight > window.innerHeight
    ? Math.max(12, clientY - estimatedHeight - 14)
    : below;
  return { top, left };
}

export default function WritingWorkspace({ initialTool = "paraphrase" }: WritingWorkspaceProps) {
  const [tool, setTool] = useState<WorkspaceTool>(initialTool);
  const [inputText, setInputText] = useState("");
  const [output, setOutput] = useState("");
  const [compareOutput, setCompareOutput] = useState("");
  const [activeVariant, setActiveVariant] = useState<"primary" | "baseline">("primary");
  const [intensity, setIntensity] = useState(3);
  const [writingMode, setWritingMode] = useState<ParaphraseMode>(
    initialTool === "humanize" ? "humanize" : "standard",
  );
  const [model, setModel] = useState("standard");
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [modelUsed, setModelUsed] = useState("");
  const [resultMeta, setResultMeta] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeSelection, setActiveSelection] = useState<ActiveSelection | null>(null);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [refineError, setRefineError] = useState("");
  const [undoStack, setUndoStack] = useState<Array<{ output: string; compareOutput: string }>>([]);
  const [redoStack, setRedoStack] = useState<Array<{ output: string; compareOutput: string }>>([]);
  const [isEditingOutput, setIsEditingOutput] = useState(false);
  const [copied, setCopied] = useState(false);
  const [grammarLanguage, setGrammarLanguage] = useState("auto");
  const [summaryMode, setSummaryMode] = useState<"paragraph" | "bullet">("paragraph");
  const [summaryLength, setSummaryLength] = useState(150);
  const [sourceLanguage, setSourceLanguage] = useState("auto");
  const [targetLanguage, setTargetLanguage] = useState("fr");
  const [sourceFilename, setSourceFilename] = useState("");
  const [documentLoading, setDocumentLoading] = useState(false);
  const [documentDownloading, setDocumentDownloading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);
  const suggestionCache = useRef(new Map<string, string[]>());
  const { token, user } = useAuth();

  const toolConfig = TOOLS.find((item) => item.id === tool) ?? TOOLS[0];
  const displayOutput = activeVariant === "primary" ? output : compareOutput;
  const sentences = useMemo(() => getSentenceSegments(displayOutput), [displayOutput]);
  const supportsRefinement = tool === "paraphrase" || tool === "humanize";
  const supportsModels = tool === "paraphrase" || tool === "humanize";
  const inputLimit = tool === "translate"
    ? 2000
    : tool === "grammar" || tool === "summarize" || tool === "tone"
      ? 5000
      : 50000;
  const originalWords = useMemo(() => {
    const words = inputText.match(/[\p{L}\p{N}]+(?:[’'][\p{L}\p{N}]+)*/gu) ?? [];
    return new Set(words.map(normaliseWord));
  }, [inputText]);

  const closeSuggestions = useCallback(() => {
    requestId.current += 1;
    setActiveSelection(null);
    setSuggestions([]);
    setRefineError("");
  }, []);

  const changeTool = (nextTool: WorkspaceTool) => {
    if (nextTool === tool) return;
    setTool(nextTool);
    setWritingMode(nextTool === "humanize" ? "humanize" : "standard");
    setOutput("");
    setCompareOutput("");
    setActiveVariant("primary");
    setResultMeta("");
    setError("");
    setUndoStack([]);
    setRedoStack([]);
    setIsEditingOutput(false);
    closeSuggestions();
  };

  const fetchSuggestions = async (
    fullText: string,
    selection: ActiveSelection,
    selectedText: string,
    clientX: number,
    clientY: number,
  ) => {
    setActiveSelection(selection);
    setPopoverPosition(getPopoverPosition(clientX, clientY, selection.kind));
    setRefineError("");
    const effectiveMode = tool === "humanize" ? "humanize" : writingMode;
    const cacheKey = `${selection.kind}:${effectiveMode}:${intensity}:${selectedText}:${fullText}`;
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
        effectiveMode,
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

  const selectSentence = (
    event: React.MouseEvent<HTMLElement>,
    sentenceIndex: number,
    fullText = displayOutput,
  ) => {
    if (!supportsRefinement) return;
    const sentence = getSentenceSegments(fullText)[sentenceIndex];
    if (!sentence) return;
    void fetchSuggestions(
      fullText,
      { kind: "sentence", sentenceIndex },
      sentence.text,
      event.clientX,
      event.clientY,
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
    if (!supportsRefinement) return;
    const rect = event.currentTarget.getBoundingClientRect();
    void fetchSuggestions(
      displayOutput,
      { kind: "word", sentenceIndex, word, start, end },
      word,
      rect.left,
      rect.bottom,
    );
  };

  const processWithModel = async (selectedModel: string): Promise<ProcessResult> => {
    if (tool === "paraphrase") {
      const response = await paraphraseText(
        inputText,
        intensity,
        selectedModel,
        token ?? undefined,
        writingMode,
      );
      return { text: response.paraphrased, modelUsed: response.model_used };
    }
    if (tool === "humanize") {
      const response = await humanizeText(inputText, selectedModel, token ?? undefined);
      const details = response.steps
        ? `${response.steps.chunks_processed ?? "1"} section(s) processed · ${response.steps.quality_retries ?? "0"} quality retry(s)`
        : "Meaning and facts preserved";
      return { text: response.humanized, modelUsed: response.model_used, meta: details };
    }
    if (tool === "grammar") {
      const response = await checkGrammar(inputText, grammarLanguage);
      return {
        text: applyGrammarFixes(inputText, response.errors),
        meta: response.error_count
          ? `${response.error_count} issue${response.error_count === 1 ? "" : "s"} corrected using the top suggestion`
          : "No grammar issues found",
      };
    }
    if (tool === "summarize") {
      const response = await summarizeText(inputText, summaryMode, summaryLength);
      return { text: response.summary, meta: `${summaryMode === "bullet" ? "Bullet" : "Paragraph"} summary` };
    }
    if (tool === "translate") {
      const response = await translateText(inputText, sourceLanguage, targetLanguage);
      const language = TRANSLATION_LANGUAGES.find(({ code }) => code === targetLanguage)?.label ?? targetLanguage;
      return { text: response.translated, meta: `Translated to ${language}` };
    }
    const response = await detectTone(inputText);
    return {
      text: response.tones
        .slice(0, 6)
        .map((tone) => `${tone.label[0].toUpperCase()}${tone.label.slice(1)}  ${Math.round(tone.score * 100)}%`)
        .join("\n"),
      meta: `Primary tone: ${response.primary_tone}`,
    };
  };

  const handleProcess = async () => {
    if (!inputText.trim() || loading) return;
    setLoading(true);
    setError("");
    setResultMeta("");
    setModelUsed("");
    setActiveVariant("primary");
    setUndoStack([]);
    setRedoStack([]);
    setIsEditingOutput(false);
    closeSuggestions();
    suggestionCache.current.clear();

    try {
      const shouldCompare = supportsModels
        && Boolean(user?.is_premium)
        && model !== "standard"
        && compareEnabled;
      const effectiveModel = supportsModels && user?.is_premium ? model : "standard";
      const [primary, baseline] = await Promise.all([
        processWithModel(effectiveModel),
        shouldCompare ? processWithModel("standard") : Promise.resolve<ProcessResult | null>(null),
      ]);
      setOutput(primary.text);
      setCompareOutput(baseline?.text ?? "");
      setModelUsed(primary.modelUsed ?? "standard");
      setResultMeta(primary.meta ?? "");
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const commitOutput = (nextOutput: string) => {
    if (nextOutput === displayOutput) return;
    setUndoStack((stack) => [...stack, { output, compareOutput }]);
    setRedoStack([]);
    if (activeVariant === "primary") setOutput(nextOutput);
    else setCompareOutput(nextOutput);
    closeSuggestions();
  };

  const beginOutputEdit = () => {
    if (!displayOutput || isEditingOutput) return;
    setUndoStack((stack) => [...stack, { output, compareOutput }]);
    setRedoStack([]);
    setIsEditingOutput(true);
    closeSuggestions();
  };

  const updateOutputDraft = (nextOutput: string) => {
    if (activeVariant === "primary") setOutput(nextOutput);
    else setCompareOutput(nextOutput);
  };

  const applySuggestion = (suggestion: string) => {
    if (!activeSelection) return;
    if (activeSelection.kind === "word") {
      commitOutput(
        `${displayOutput.slice(0, activeSelection.start)}${suggestion}${displayOutput.slice(activeSelection.end)}`,
      );
      return;
    }
    const sentence = sentences[activeSelection.sentenceIndex];
    if (!sentence) return;
    commitOutput(`${displayOutput.slice(0, sentence.start)}${suggestion}${displayOutput.slice(sentence.end)}`);
  };

  const undo = () => {
    const previous = undoStack[undoStack.length - 1];
    if (!previous) return;
    setRedoStack((stack) => [{ output, compareOutput }, ...stack]);
    setUndoStack((stack) => stack.slice(0, -1));
    setOutput(previous.output);
    setCompareOutput(previous.compareOutput);
    setIsEditingOutput(false);
    closeSuggestions();
  };

  const redo = () => {
    const next = redoStack[0];
    if (!next) return;
    setUndoStack((stack) => [...stack, { output, compareOutput }]);
    setRedoStack((stack) => stack.slice(1));
    setOutput(next.output);
    setCompareOutput(next.compareOutput);
    setIsEditingOutput(false);
    closeSuggestions();
  };

  const pasteText = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setInputText(text.slice(0, inputLimit));
    } catch {
      setError("Clipboard access is blocked. Paste into the editor with Ctrl+V.");
    }
  };

  const loadDocument = async (file: File) => {
    setDocumentLoading(true);
    setError("");
    try {
      const document = await extractDocument(file);
      setInputText(document.text);
      setSourceFilename(document.filename);
      setOutput("");
      setCompareOutput("");
      setResultMeta(`${wordCount(document.text)} words loaded from ${document.filename}`);
      closeSuggestions();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setDocumentLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const downloadOutput = async () => {
    if (!displayOutput) return;
    setDocumentDownloading(true);
    setError("");
    try {
      const filename = sourceFilename || "anovo-result.docx";
      const blob = await downloadProcessedDoc(displayOutput, filename);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${filename.replace(/\.[^.]+$/, "")}_${tool}.docx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setDocumentDownloading(false);
    }
  };

  const useOutputAsInput = () => {
    if (!displayOutput) return;
    setInputText(displayOutput.slice(0, inputLimit));
    setOutput("");
    setCompareOutput("");
    setActiveVariant("primary");
    setResultMeta("Result moved to the editor for another writing pass");
    setUndoStack([]);
    setRedoStack([]);
    closeSuggestions();
  };

  const copyOutput = async () => {
    if (!displayOutput) return;
    try {
      await navigator.clipboard.writeText(displayOutput);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Could not copy the result to your clipboard.");
    }
  };

  const renderSentence = (sentence: SentenceSegment, sentenceIndex: number) => {
    if (!supportsRefinement) {
      return <span key={`${sentence.start}-${sentence.end}`}>{sentence.text}</span>;
    }
    const tokens = Array.from(
      sentence.text.matchAll(/[\p{L}\p{N}]+(?:[’'][\p{L}\p{N}]+)*|[^\p{L}\p{N}]+/gu),
    );
    const isSelected = activeSelection?.sentenceIndex === sentenceIndex;

    return (
      <span
        key={`${sentence.start}-${sentence.end}`}
        onClick={(event) => selectSentence(event, sentenceIndex)}
        className={`group/sentence cursor-pointer rounded px-0.5 transition-colors ${
          isSelected
            ? "bg-emerald-50 dark:bg-emerald-950/60"
            : "hover:bg-slate-100 dark:hover:bg-slate-800"
        }`}
      >
        {tokens.map((token, tokenIndex) => {
          const value = token[0];
          const localStart = token.index ?? 0;
          if (!/^[\p{L}\p{N}]/u.test(value)) return <span key={tokenIndex}>{value}</span>;
          const absoluteStart = sentence.start + localStart;
          const changed = !originalWords.has(normaliseWord(value));
          const selectedWord = activeSelection?.kind === "word" && activeSelection.start === absoluteStart;
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
              aria-label={`Show alternatives for ${value}`}
            >
              {value}
            </button>
          );
        })}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            selectSentence(event, sentenceIndex);
          }}
          className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded text-xs text-emerald-600 opacity-0 transition-opacity hover:bg-emerald-100 focus:opacity-100 group-hover/sentence:opacity-100 dark:text-emerald-400 dark:hover:bg-emerald-900"
          aria-label={`Show alternatives for sentence ${sentenceIndex + 1}`}
        >
          ↻
        </button>
      </span>
    );
  };

  return (
    <div className="mx-auto w-full max-w-[1280px] pb-8">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
              Anovo Workspace
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              All tools, one editor
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            Write, refine, and compare without changing pages.
          </h1>
        </div>
        <p className="max-w-md text-xs leading-5 text-slate-500 dark:text-slate-400">
          Click any changed word or sentence to open alternatives exactly where you are working.
        </p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_55px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 bg-slate-50/70 px-3 pt-3 dark:border-slate-800 dark:bg-slate-900/45 sm:px-4">
          <div className="no-scrollbar flex gap-1 overflow-x-auto pb-3" role="tablist" aria-label="Writing tool">
            {TOOLS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tool === item.id}
                onClick={() => changeTool(item.id)}
                title={item.description}
                className={`group flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  tool === item.id
                    ? "bg-white text-emerald-800 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-emerald-300 dark:ring-slate-700"
                    : "text-slate-500 hover:bg-white/70 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
                }`}
              >
                <span className={`flex h-6 w-6 items-center justify-center rounded-lg text-sm ${
                  tool === item.id ? "bg-emerald-100 dark:bg-emerald-950" : "bg-slate-100 dark:bg-slate-800"
                }`}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {tool === "paraphrase" ? (
          <div className="border-b border-slate-200 px-3 py-2 dark:border-slate-800 sm:px-5">
            <div className="no-scrollbar flex gap-1 overflow-x-auto" role="tablist" aria-label="Paraphrase mode">
              {MODES.map((modeOption) => (
                <button
                  key={modeOption.id}
                  type="button"
                  role="tab"
                  aria-selected={writingMode === modeOption.id}
                  title={modeOption.hint}
                  onClick={() => setWritingMode(modeOption.id)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    writingMode === modeOption.id
                      ? "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-800"
                      : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
                  }`}
                >
                  {modeOption.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid min-h-[570px] lg:grid-cols-2">
          <div className="flex min-h-[470px] flex-col border-b border-slate-200 lg:border-b-0 lg:border-r dark:border-slate-800">
            <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-2 dark:border-slate-900">
              <div className="min-w-0">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Your text</span>
                <span className="ml-2 text-[11px] text-slate-400">{toolConfig.description}</span>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,.txt"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void loadDocument(file);
                  }}
                  aria-label="Upload document"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={documentLoading}
                  className="rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-900"
                >
                  {documentLoading ? "Reading…" : "Upload document"}
                </button>
                <button
                  type="button"
                  onClick={pasteText}
                  className="rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
                >
                  Paste
                </button>
                {inputText ? (
                  <button
                    type="button"
                    onClick={() => {
                      setInputText("");
                      setOutput("");
                      setCompareOutput("");
                      setSourceFilename("");
                      closeSuggestions();
                    }}
                    className="rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>

            {sourceFilename ? (
              <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50/70 px-5 py-2 text-xs text-emerald-800 dark:border-emerald-950 dark:bg-emerald-950/35 dark:text-emerald-300">
                <span className="min-w-0 truncate">Document loaded · {sourceFilename}</span>
                <button type="button" onClick={() => setSourceFilename("")} className="ml-3 shrink-0 font-semibold hover:underline">
                  Detach
                </button>
              </div>
            ) : null}

            <textarea
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                  event.preventDefault();
                  void handleProcess();
                }
              }}
              placeholder={`Enter or paste text to ${toolConfig.label.toLocaleLowerCase()}…`}
              className="min-h-[320px] flex-1 resize-none bg-transparent px-5 py-5 text-[15px] leading-7 text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-200"
              maxLength={inputLimit}
              aria-label={`Text to ${tool}`}
            />

            <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-900">
              {tool === "paraphrase" ? (
                <div className="mb-4">
                  <SynonymSlider value={intensity} onChange={setIntensity} />
                </div>
              ) : null}

              {tool === "grammar" ? (
                <div className="mb-4 flex items-center gap-2">
                  <label htmlFor="grammar-language" className="text-xs font-semibold text-slate-500">Language</label>
                  <select
                    id="grammar-language"
                    value={grammarLanguage}
                    onChange={(event) => setGrammarLanguage(event.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                  >
                    <option value="auto">Auto-detect</option>
                    <option value="en-US">English (US)</option>
                    <option value="en-GB">English (UK)</option>
                    <option value="de-DE">German</option>
                    <option value="fr">French</option>
                    <option value="es">Spanish</option>
                    <option value="pt">Portuguese</option>
                  </select>
                </div>
              ) : null}

              {tool === "summarize" ? (
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <div className="flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
                    {(["paragraph", "bullet"] as const).map((format) => (
                      <button
                        key={format}
                        type="button"
                        onClick={() => setSummaryMode(format)}
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold capitalize ${
                          summaryMode === format
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "text-slate-500"
                        }`}
                      >
                        {format}
                      </button>
                    ))}
                  </div>
                  <label className="flex flex-1 items-center gap-2 text-xs font-semibold text-slate-500">
                    Length
                    <input
                      type="range"
                      min={30}
                      max={500}
                      step={10}
                      value={summaryLength}
                      onChange={(event) => setSummaryLength(Number(event.target.value))}
                      className="min-w-24 flex-1 accent-emerald-600"
                    />
                    <span className="w-8 tabular-nums">{summaryLength}</span>
                  </label>
                </div>
              ) : null}

              {tool === "translate" ? (
                <div className="mb-4 flex items-center gap-2">
                  <select
                    aria-label="Source language"
                    value={sourceLanguage}
                    onChange={(event) => setSourceLanguage(event.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                  >
                      <option value="auto">Detect language</option>
                      {TRANSLATION_LANGUAGES.map(({ code, label }) => <option key={code} value={code}>{label}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setSourceLanguage(targetLanguage);
                      setTargetLanguage(sourceLanguage === "auto" ? "en" : sourceLanguage);
                    }}
                    aria-label="Swap languages"
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
                  >
                    ⇄
                  </button>
                  <select
                    aria-label="Target language"
                    value={targetLanguage}
                    onChange={(event) => setTargetLanguage(event.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                  >
                      {TRANSLATION_LANGUAGES.map(({ code, label }) => <option key={code} value={code}>{label}</option>)}
                  </select>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs tabular-nums text-slate-400">
                  {wordCount(inputText)} words · {inputText.length.toLocaleString()} / {inputLimit.toLocaleString()}
                </span>
                <button
                  type="button"
                  onClick={handleProcess}
                  disabled={!inputText.trim() || loading}
                  className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : null}
                  {loading ? toolConfig.loadingLabel : toolConfig.verb}
                </button>
              </div>
            </div>
          </div>

          <div className="relative flex min-h-[570px] flex-col bg-slate-50/35 dark:bg-slate-950">
            <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-2 dark:border-slate-900">
              <div className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {toolConfig.outputLabel}
                </span>
                {compareOutput ? (
                  <div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveVariant("primary");
                        setIsEditingOutput(false);
                        closeSuggestions();
                      }}
                      className={`rounded-md px-2 py-1 text-[10px] font-bold ${
                        activeVariant === "primary"
                          ? "bg-white text-emerald-700 shadow-sm dark:bg-slate-700 dark:text-emerald-300"
                          : "text-slate-500"
                      }`}
                    >
                      {modelUsed && modelUsed !== "standard" ? modelUsed : "PRO"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveVariant("baseline");
                        setIsEditingOutput(false);
                        closeSuggestions();
                      }}
                      className={`rounded-md px-2 py-1 text-[10px] font-bold ${
                        activeVariant === "baseline"
                          ? "bg-white text-emerald-700 shadow-sm dark:bg-slate-700 dark:text-emerald-300"
                          : "text-slate-500"
                      }`}
                    >
                      Anovo Fast
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-1">
                {displayOutput || isEditingOutput ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (isEditingOutput) {
                        setIsEditingOutput(false);
                        closeSuggestions();
                      } else {
                        beginOutputEdit();
                      }
                    }}
                    aria-pressed={isEditingOutput}
                    className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                      isEditingOutput
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
                    }`}
                  >
                    {isEditingOutput ? "Done" : "Edit"}
                  </button>
                ) : null}
                {displayOutput ? (
                  <button
                    type="button"
                    onClick={useOutputAsInput}
                    className="rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
                  >
                    Use as input
                  </button>
                ) : null}
                {displayOutput ? (
                  <button
                    type="button"
                    onClick={downloadOutput}
                    disabled={documentDownloading}
                    className="rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-900"
                  >
                    {documentDownloading ? "Preparing…" : "Download .docx"}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={undo}
                  disabled={!undoStack.length}
                  aria-label="Undo replacement"
                  className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-25 dark:hover:bg-slate-900"
                >
                  ↶
                </button>
                <button
                  type="button"
                  onClick={redo}
                  disabled={!redoStack.length}
                  aria-label="Redo replacement"
                  className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-25 dark:hover:bg-slate-900"
                >
                  ↷
                </button>
                <button
                  type="button"
                  onClick={copyOutput}
                  disabled={!displayOutput}
                  className="rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-900"
                >
                  {copied ? "Copied" : "Copy all"}
                </button>
              </div>
            </div>

            <div className="min-h-[390px] flex-1 overflow-y-auto px-5 py-5 text-[15px] leading-7 text-slate-800 dark:text-slate-200">
              {loading ? (
                <div className="space-y-3 pt-1" aria-label={`Running ${tool}`}>
                  <div className="h-4 w-11/12 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-4 w-8/12 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                </div>
              ) : isEditingOutput ? (
                <textarea
                  value={displayOutput}
                  onChange={(event) => updateOutputDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      setIsEditingOutput(false);
                    }
                  }}
                  autoFocus
                  aria-label={`Edit ${toolConfig.outputLabel.toLocaleLowerCase()}`}
                  className="min-h-[390px] w-full resize-none bg-transparent text-[15px] leading-7 text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-200"
                />
              ) : displayOutput ? (
                <div className="whitespace-pre-wrap">
                  {sentences.map((sentence, sentenceIndex) => {
                    const previousEnd = sentenceIndex === 0 ? 0 : sentences[sentenceIndex - 1].end;
                    const gap = displayOutput.slice(previousEnd, sentence.start);
                    return (
                      <span key={`${sentence.start}-wrapper`}>
                        {gap}
                        {renderSentence(sentence, sentenceIndex)}
                      </span>
                    );
                  })}
                  {displayOutput.slice(sentences[sentences.length - 1]?.end ?? 0)}
                </div>
              ) : (
                <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center text-slate-400">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-xl text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                    {toolConfig.icon}
                  </div>
                  <p className="font-semibold text-slate-500 dark:text-slate-400">
                    Your {toolConfig.outputLabel.toLocaleLowerCase()} will appear here
                  </p>
                  <p className="mt-1 max-w-xs text-xs leading-5">
                    {supportsRefinement
                      ? "After processing, select any word or sentence to refine it in place."
                      : `Stay in this workspace and switch tools without copying your text between pages.`}
                  </p>
                </div>
              )}
            </div>

            <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-white px-5 py-2.5 text-xs text-slate-400 dark:border-slate-900 dark:bg-slate-950">
              <span>
                {displayOutput
                  ? `${wordCount(displayOutput)} words · ${wordCount(displayOutput) - wordCount(inputText) >= 0 ? "+" : ""}${wordCount(displayOutput) - wordCount(inputText)} vs source`
                  : "Ready"}
              </span>
              <span className="text-right">
                {isEditingOutput
                  ? "Editing result · press Escape or Done when finished"
                  : resultMeta || (supportsRefinement && displayOutput ? "Click highlighted text for alternatives" : "")}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-900/50 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
            {supportsRefinement ? (
              <>
                <span><span className="mr-1.5 inline-block h-0.5 w-4 bg-emerald-500 align-middle" />Changed words are underlined</span>
                <span>Alternatives open beside your selection</span>
                <span>Edit the full result directly at any time</span>
              </>
            ) : (
              <span>Switch tools above—the source text stays in this editor.</span>
            )}
            <span>Ctrl + Enter to run</span>
          </div>
          {supportsModels ? (
            <ModelSelector
              selectedModel={model}
              onModelChange={(nextModel) => {
                setModel(nextModel);
                if (nextModel === "standard") setCompareEnabled(false);
              }}
              compareEnabled={compareEnabled}
              onCompareChange={setCompareEnabled}
              compact
            />
          ) : (
            <span className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              Anovo specialised engine
            </span>
          )}
        </div>
      </section>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {modelUsed === "standard" && model !== "standard" && output ? (
        <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
          The selected premium model was unavailable, so Anovo Fast completed this result.
        </p>
      ) : null}

      {activeSelection ? (
        <SuggestionPopover
          kind={activeSelection.kind}
          label={activeSelection.kind === "word" ? activeSelection.word : "Selected sentence"}
          suggestions={suggestions}
          loading={suggestionLoading}
          error={refineError}
          position={popoverPosition}
          onApply={applySuggestion}
          onClose={closeSuggestions}
        />
      ) : null}
    </div>
  );
}
