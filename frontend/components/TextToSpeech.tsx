"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface TextToSpeechProps {
  text: string;
}

export default function TextToSpeech({ text }: TextToSpeechProps) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  const handlePlay = useCallback(() => {
    if (!text.trim()) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, [text]);

  const handlePause = useCallback(() => {
    window.speechSynthesis.pause();
    setSpeaking(false);
  }, []);

  const handleStop = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  if (!supported) return null;

  return (
    <div className="flex items-center gap-2 mt-2">
      <span className="text-xs text-gray-500 dark:text-gray-400">Listen:</span>
      {!speaking ? (
        <button
          onClick={handlePlay}
          disabled={!text.trim()}
          className="flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 hover:bg-brand-200 dark:hover:bg-brand-800 disabled:opacity-40 transition-colors"
        >
          ▶ Play
        </button>
      ) : (
        <button
          onClick={handlePause}
          className="flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 transition-colors"
        >
          ⏸ Pause
        </button>
      )}
      <button
        onClick={handleStop}
        disabled={!speaking}
        className="flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 disabled:opacity-40 transition-colors"
      >
        ⏹ Stop
      </button>
    </div>
  );
}
