"use client";

import { useState } from "react";
import TextEditor from "@/components/TextEditor";
import SynonymSlider from "@/components/SynonymSlider";
import OutputDisplay from "@/components/OutputDisplay";
import PremiumToggle from "@/components/PremiumToggle";
import { paraphraseText } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function ParaphrasePage() {
  const [inputText, setInputText] = useState("");
  const [intensity, setIntensity] = useState(3);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [premium, setPremium] = useState(false);
  const { token } = useAuth();

  const handleParaphrase = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await paraphraseText(inputText, intensity, premium, token ?? undefined);
      setOutput(res.paraphrased);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Paraphraser</h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
        Rewrite your text with adjustable intensity. Supports long texts with automatic chunking.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Original Text
          </label>
          <TextEditor value={inputText} onChange={setInputText} placeholder="Enter text to paraphrase…" />
          <SynonymSlider value={intensity} onChange={setIntensity} />
          <PremiumToggle enabled={premium} onChange={setPremium} />
          <button
            onClick={handleParaphrase}
            disabled={loading || !inputText.trim()}
            className="self-start px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {loading ? "Paraphrasing…" : "Paraphrase"}
          </button>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        {/* Output */}
        <OutputDisplay text={output} label="Paraphrased Text" loading={loading} />
      </div>
    </div>
  );
}
