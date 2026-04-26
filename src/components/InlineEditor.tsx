import {
  createElement,
  useEffect,
  useRef,
  type CSSProperties,
  type JSX,
} from "react";
import DOMPurify, { type Config } from "dompurify";

type Props = {
  initialValue: string;
  as: keyof JSX.IntrinsicElements;
  className?: string;
  style?: CSSProperties;
  mode: "text" | "html";
  onCommit: (next: string) => void;
};

const HTML_CONFIG: Config = {
  ALLOWED_TAGS: ["em", "strong", "b", "i", "a", "span", "br"],
  ALLOWED_ATTR: ["href", "target", "rel", "title", "class"],
};

export default function InlineEditor({
  initialValue,
  as,
  className,
  style,
  mode,
  onCommit,
}: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const committedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (mode === "html") {
      el.innerHTML = initialValue;
    } else {
      el.textContent = initialValue;
    }
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [mode, initialValue]);

  const commit = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    const el = ref.current;
    if (!el) {
      onCommit(initialValue);
      return;
    }
    if (mode === "text") {
      const next = (el.textContent ?? "").replace(/\s+/g, " ").trim();
      onCommit(next);
    } else {
      const dirty = el.innerHTML;
      const clean = String(DOMPurify.sanitize(dirty, HTML_CONFIG)).trim();
      onCommit(clean);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      committedRef.current = true;
      onCommit(initialValue);
      ref.current?.blur();
      return;
    }
    if (mode === "text" && e.key === "Enter") {
      e.preventDefault();
      ref.current?.blur();
      return;
    }
    if (mode === "html") {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        document.execCommand("bold");
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") {
        e.preventDefault();
        document.execCommand("italic");
        return;
      }
    }
  };

  return createElement(as, {
    ref,
    className,
    style,
    contentEditable: true,
    suppressContentEditableWarning: true,
    spellCheck: true,
    role: "textbox",
    "aria-multiline": mode === "html",
    onBlur: commit,
    onKeyDown: handleKeyDown,
    onPaste: (e: React.ClipboardEvent<HTMLElement>) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");
      document.execCommand("insertText", false, text);
    },
  });
}
