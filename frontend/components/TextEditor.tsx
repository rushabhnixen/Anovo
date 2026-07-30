"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";

interface TextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

export default function TextEditor({
  value,
  onChange,
  placeholder = "Enter your text here…",
  readOnly = false,
}: TextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editable: !readOnly,
    onUpdate({ editor }) {
      onChange(editor.getText());
    },
  });

  // Sync external value changes (e.g. clear button)
  useEffect(() => {
    if (editor && editor.getText() !== value) {
      editor.commands.setContent(value || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div
      className={`min-h-[240px] rounded-2xl border p-4 text-[15px] shadow-sm transition-colors ${
        readOnly
          ? "cursor-default border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
          : "border-slate-200 bg-white focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950 dark:focus-within:ring-emerald-950"
      }`}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
