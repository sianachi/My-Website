import { useMemo, useRef, type CSSProperties, type JSX } from "react";
import { Editor as TinyMCE } from "@tinymce/tinymce-react";
import type { Editor as TinyMCEEditor } from "tinymce";

import "tinymce/tinymce";
import "tinymce/models/dom/model";
import "tinymce/themes/silver";
import "tinymce/icons/default";
import "tinymce/skins/ui/oxide/skin.js";
import "tinymce/plugins/autolink";
import "tinymce/plugins/link";

type Props = {
  initialValue: string;
  as: keyof JSX.IntrinsicElements;
  className?: string;
  style?: CSSProperties;
  mode: "text" | "html";
  onCommit: (next: string) => void;
};

export default function InlineEditor({
  initialValue,
  as,
  className,
  style,
  mode,
  onCommit,
}: Props) {
  const editorRef = useRef<TinyMCEEditor | null>(null);
  const committedRef = useRef(false);

  const init = useMemo(() => {
    const base = {
      licenseKey: "gpl",
      inline: true,
      menubar: false,
      branding: false,
      promotion: false,
      statusbar: false,
      toolbar_persist: true,
      toolbar_mode: "floating" as const,
      contextmenu: false as const,
      browser_spellcheck: true,
      relative_urls: false,
      convert_urls: false,
    };

    if (mode === "text") {
      return {
        ...base,
        plugins: "",
        toolbar: false as const,
        forced_root_block: "" as const,
        valid_elements: "",
        paste_as_text: true,
      };
    }

    return {
      ...base,
      plugins: "autolink link",
      toolbar: "bold italic | link unlink | removeformat",
      quickbars_selection_toolbar: false,
      forced_root_block: "" as const,
      valid_elements:
        "em,strong,b/strong,i/em,a[href|target|rel|title],span[class],br",
    };
  }, [mode]);

  const commit = (next: string) => {
    if (committedRef.current) return;
    committedRef.current = true;
    const cleaned = mode === "text" ? next.replace(/\s+/g, " ").trim() : next.trim();
    if (cleaned !== initialValue) {
      onCommit(cleaned);
    } else {
      onCommit(initialValue);
    }
  };

  return (
    <TinyMCE
      licenseKey="gpl"
      tagName={as}
      initialValue={initialValue}
      inline
      init={init}
      onInit={(_evt, editor) => {
        editorRef.current = editor;
        const target = editor.getContainer() as HTMLElement | null;
        if (target) {
          if (className) target.className = className;
          if (style) Object.assign(target.style, style);
        }
        editor.focus();
        editor.selection.select(editor.getBody(), true);
        editor.selection.collapse(false);
      }}
      onBlur={() => {
        const editor = editorRef.current;
        if (!editor) return;
        commit(
          mode === "text"
            ? editor.getContent({ format: "text" })
            : editor.getContent({ format: "html" }),
        );
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          commit(initialValue);
          editorRef.current?.getBody().blur();
        }
        if (mode === "text" && e.key === "Enter") {
          e.preventDefault();
          editorRef.current?.getBody().blur();
        }
      }}
    />
  );
}
