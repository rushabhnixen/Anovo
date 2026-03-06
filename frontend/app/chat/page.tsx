"use client";

import { useState, useRef, useEffect } from "react";
import { chatWithAI, ChatMessage } from "@/lib/api";

const MODES = [
  { value: "general", label: "General", icon: "💬" },
  { value: "creative", label: "Creative", icon: "🎨" },
  { value: "academic", label: "Academic", icon: "🎓" },
] as const;

export default function ChatPage() {
  const [mode, setMode] = useState<string>("general");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = { role: "user", content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const res = await chatWithAI(text, mode, messages);
      const assistantMessage: ChatMessage = { role: "assistant", content: res.reply };
      setMessages([...updatedMessages, assistantMessage]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setMessages([]);
    setError("");
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">AI Chat</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Chat with AI in different modes — powered by Ollama.
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClear}
            className="text-xs px-3 py-1.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Clear Chat
          </button>
        )}
      </div>

      {/* Mode selector */}
      <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700 mb-4 self-start">
        {MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => setMode(m.value)}
            className={`px-4 py-2 text-sm transition-colors flex items-center gap-1.5 ${
              mode === m.value
                ? "bg-brand-600 text-white"
                : "bg-white dark:bg-gray-950 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <span>{m.icon}</span>
            {m.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 space-y-4 mb-4">
        {messages.length === 0 && !loading && (
          <div className="text-center text-gray-400 dark:text-gray-600 py-12">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-sm">Start a conversation with AI.</p>
            <p className="text-xs mt-1">Select a mode above to change the assistant&apos;s personality.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-brand-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-400 flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Thinking…
            </div>
          </div>
        )}

        {error && (
          <div className="text-center">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
          rows={2}
          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium disabled:opacity-50 transition-colors self-end"
        >
          Send
        </button>
      </div>
    </div>
  );
}
