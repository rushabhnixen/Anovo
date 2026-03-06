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
      className={`min-h-[180px] rounded-lg border p-3 text-sm transition-colors ${
        readOnly
          ? "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 cursor-default"
          : "bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500"
      }`}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
