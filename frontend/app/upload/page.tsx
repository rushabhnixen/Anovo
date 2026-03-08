"use client";

import { useState, useRef } from "react";
import { uploadDocument, downloadProcessedDoc } from "@/lib/api";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"humanize" | "paraphrase">("humanize");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [processedText, setProcessedText] = useState("");
  const [filename, setFilename] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setOriginalText("");
    setProcessedText("");
    try {
      const res = await uploadDocument(file, mode);
      setOriginalText(res.original_text);
      setProcessedText(res.processed_text);
      setFilename(res.filename);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!processedText) return;
    setDownloading(true);
    try {
      const blob = await downloadProcessedDoc(processedText, filename);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename.replace(".docx", `_${mode}d.docx`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDownloading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith(".docx")) setFile(f);
  };

  const handleReset = () => {
    setFile(null);
    setOriginalText("");
    setProcessedText("");
    setFilename("");
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Document Upload</h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
        Upload a Word document (.docx) and humanize or paraphrase the entire text. Compare results side by side.
      </p>

      {/* Upload controls */}
      {!processedText && (
        <div className="flex flex-col gap-4">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center hover:border-brand-400 transition-colors"
          >
            <input
              ref={inputRef}
              type="file"
              accept=".docx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="text-gray-400 dark:text-gray-500 mb-2">
                <svg className="w-10 h-10 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                {file ? (
                  <span className="text-brand-600 dark:text-brand-400 font-medium">{file.name}</span>
                ) : (
                  <span>Drop a .docx file here or click to browse</span>
                )}
              </div>
            </label>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Mode</label>
              <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700">
                {(["humanize", "paraphrase"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`px-4 py-1.5 text-sm capitalize transition-colors ${
                      mode === m
                        ? "bg-brand-600 text-white"
                        : "bg-white dark:bg-gray-950 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleUpload}
              disabled={loading || !file}
              className="mt-5 px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {loading ? "Processing…" : "Process Document"}
            </button>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12 gap-3 text-gray-400">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Processing your document…
        </div>
      )}

      {/* Side-by-side comparison */}
      {processedText && !loading && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Results — {filename}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {downloading ? "Preparing…" : "Download .docx"}
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                Upload Another
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Original */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Original</span>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 text-sm whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                {originalText}
              </div>
            </div>

            {/* Processed */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {mode === "humanize" ? "Humanized" : "Paraphrased"}
              </span>
              <div className="rounded-lg border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-950/30 p-4 text-sm whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                {processedText}
              </div>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
      )}
    </div>
  );
}
