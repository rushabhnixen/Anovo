"use client";

import { useState } from "react";
import TextEditor from "@/components/TextEditor";
import OutputDisplay from "@/components/OutputDisplay";
import LanguageSelector from "@/components/LanguageSelector";
import { translateText } from "@/lib/api";

export default function TranslatePage() {
  const [inputText, setInputText] = useState("");
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("fr");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await translateText(inputText, sourceLang, targetLang);
      setOutput(res.translated);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Translator</h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
        Translate text between 100+ languages using Helsinki-NLP OpusMT models.
      </p>

      {/* Language selectors */}
      <div className="flex items-end gap-3 mb-4">
        <LanguageSelector
          label="From"
          value={sourceLang}
          onChange={setSourceLang}
          exclude={targetLang}
        />
        <button
          onClick={handleSwap}
          className="mb-0.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm"
          title="Swap languages"
        >
          ⇄
        </button>
        <LanguageSelector
          label="To"
          value={targetLang}
          onChange={setTargetLang}
          exclude={sourceLang}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Original Text
          </label>
          <TextEditor value={inputText} onChange={setInputText} placeholder="Enter text to translate…" />
          <button
            onClick={handleTranslate}
            disabled={loading || !inputText.trim()}
            className="self-start px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {loading ? "Translating…" : "Translate"}
          </button>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        <OutputDisplay text={output} label="Translation" loading={loading} />
      </div>
    </div>
  );
}
