"use client";

import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";

interface TextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  /** Fired on Ctrl/Cmd + Enter, handled inside the editor so no newline is inserted. */
  onSubmit?: () => void;
}

/**
 * getText() joins blocks with "\n\n" by default, while textToDoc splits on a
 * single "\n". Sharing one separator keeps the text round-trip lossless —
 * otherwise every sync would add a blank line between paragraphs.
 */
const BLOCK_SEPARATOR = "\n";

/**
 * Build a ProseMirror document from plain text.
 *
 * Passing a raw string to `setContent` makes TipTap parse it as HTML, so a user
 * typing `<h1>Hello</h1>` had it silently turned into a real heading and
 * `<script>…</script>` dropped entirely. This editor is plain-text (onChange
 * reports `editor.getText()`), so text must go in as text.
 */
function textToDoc(text: string): JSONContent {
  const lines = text.split("\n");
  return {
    type: "doc",
    content: lines.map((line) =>
      line
        ? { type: "paragraph", content: [{ type: "text", text: line }] }
        : { type: "paragraph" },
    ),
  };
}

export default function TextEditor({
  value,
  onChange,
  placeholder = "Enter your text here…",
  readOnly = false,
  onSubmit,
}: TextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
    ],
    content: textToDoc(value),
    editable: !readOnly,
    editorProps: {
      // ProseMirror handles Enter in its own keydown handler, so a
      // preventDefault on an ancestor runs too late — the newline is already
      // inserted. Intercepting here stops it at the source.
      handleKeyDown(_view, event) {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && onSubmit) {
          event.preventDefault();
          onSubmit();
          return true;
        }
        return false;
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getText({ blockSeparator: BLOCK_SEPARATOR }));
    },
  });

  // Sync external value changes (e.g. clear button)
  useEffect(() => {
    if (editor && editor.getText({ blockSeparator: BLOCK_SEPARATOR }) !== value) {
      editor.commands.setContent(textToDoc(value || ""));
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
