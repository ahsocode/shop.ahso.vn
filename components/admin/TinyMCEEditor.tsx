"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useEffect } from "react";
import type { Editor } from "@tinymce/tinymce-react";

// Lấy type props trực tiếp từ component Editor (không cần EditorProps)
type TinyMCEReactEditorProps = React.ComponentProps<typeof Editor>;
type TinyMCEEditorInstance = {
  mode: { set: (mode: "readonly" | "design") => void };
};

const TinyMCEEditor = dynamic<TinyMCEReactEditorProps>(
  () => import("@tinymce/tinymce-react").then((mod) => mod.Editor),
  { ssr: false },
);

type TinyMCEEditorProps = {
  value: string;
  onChange: (value: string) => void;
  height?: number;
  disabled?: boolean;
};

export default function AdminTinyMCEEditor({
  value,
  onChange,
  height = 520,
  disabled = false,
}: TinyMCEEditorProps) {
  const apiKey = useMemo(
    () => process.env.NEXT_PUBLIC_TINYMCE_API_KEY || "no-api-key",
    [],
  );

  const editorRef = useRef<TinyMCEEditorInstance | null>(null);

  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;
    ed.mode.set(disabled ? "readonly" : "design");
  }, [disabled]);

  return (
    <TinyMCEEditor
      apiKey={apiKey}
      value={value}
      disabled={disabled}
      onInit={(_evt, editor: TinyMCEEditorInstance) => {
        editorRef.current = editor;
        editor.mode.set(disabled ? "readonly" : "design");
      }}
      init={{
        height,
        menubar: false,
        editable_root: true,
        plugins: ["link", "lists", "image", "table", "code", "preview", "wordcount"],
        toolbar:
          "undo redo | blocks | bold italic underline | alignleft aligncenter alignright | bullist numlist | link image table | code preview",
        content_style:
          "body { font-family: Inter, Arial, sans-serif; font-size: 14px; }",
      }}
      onEditorChange={(content: string) => onChange(content)}
    />
  );
}
