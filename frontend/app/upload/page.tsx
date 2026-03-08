"use client";

import { useState, useRef } from "react";
import { uploadDocument } from "@/lib/api";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"humanize" | "paraphrase">("humanize");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.endsWith(".docx")) {
      setFile(dropped);
      setError("");
    } else {
      setError("Only .docx files are supported");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected?.name.endsWith(".docx")) {
      setFile(selected);
      setError("");
    } else if (selected) {
      setError("Only .docx files are supported");
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const blob = await uploadDocument(file, mode);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name.replace(".docx", `_${mode}d.docx`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccess(`Document processed successfully! Check your downloads.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Document Upload</h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
        Upload a Word document (.docx) and humanize or paraphrase the entire file.
      </p>

      {/* Mode selector */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setMode("humanize")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "humanize"
              ? "bg-brand-600 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          Humanize
        </button>
        <button
          onClick={() => setMode("paraphrase")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "paraphrase"
              ? "bg-brand-600 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          Paraphrase
        </button>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-12 text-center cursor-pointer hover:border-brand-500 dark:hover:border-brand-500 transition-colors"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".docx"
          onChange={handleFileChange}
          className="hidden"
        />
        <svg
          className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        {file ? (
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {file.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium text-brand-600 dark:text-brand-400">
                Click to upload
              </span>{" "}
              or drag and drop
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Word documents (.docx) only
            </p>
          </div>
        )}
      </div>

      {/* Upload button */}
      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="px-6 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {loading
            ? `${mode === "humanize" ? "Humanizing" : "Paraphrasing"} document...`
            : `${mode === "humanize" ? "Humanize" : "Paraphrase"} Document`}
        </button>
        {file && !loading && (
          <button
            onClick={() => {
              setFile(null);
              setSuccess("");
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Clear
          </button>
        )}
      </div>

      {error && (
        <p className="mt-4 text-red-500 text-sm">{error}</p>
      )}
      {success && (
        <p className="mt-4 text-green-600 dark:text-green-400 text-sm">{success}</p>
      )}

      {loading && (
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3">
            <svg className="animate-spin h-5 w-5 text-brand-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Processing your document...
              </p>
              <p className="text-xs text-blue-500 dark:text-blue-400">
                Large documents may take a while as each section is processed individually.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
