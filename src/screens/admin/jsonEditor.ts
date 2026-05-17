import { json } from "@codemirror/lang-json";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import type { Extension } from "@codemirror/state";
import { tags as t } from "@lezer/highlight";
import { selectionTooltip } from "./selectionTooltip";
import type { JsonSelection } from "./jsonPath";

const portfolioTheme = EditorView.theme({
  "&": {
    backgroundColor: "var(--bg-2)",
    color: "var(--ink)",
    fontFamily: "var(--type-mono, monospace)",
    fontSize: "12.5px",
    height: "100%",
  },
  ".cm-scroller": {
    fontFamily: "var(--type-mono, monospace)",
    lineHeight: "1.55",
    overflow: "auto",
  },
  ".cm-content": {
    caretColor: "var(--accent)",
    padding: "12px 0",
    color: "var(--ink)",
  },
  ".cm-line": {
    padding: "0 10px",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-cursor, .cm-dropCursor": {
    borderLeft: "1.5px solid var(--accent)",
  },
  ".cm-gutters": {
    backgroundColor: "var(--bg-2)",
    color: "var(--ink-faint)",
    border: "none",
    borderRight: "1px solid var(--ink-faint)",
    paddingRight: "4px",
    fontFamily: "var(--type-mono, monospace)",
  },
  ".cm-gutterElement": {
    color: "var(--ink-faint)",
  },
  ".cm-foldGutter .cm-gutterElement": {
    color: "var(--ink-dim)",
    cursor: "pointer",
  },
  ".cm-activeLine": { backgroundColor: "transparent" },
  ".cm-activeLineGutter": {
    backgroundColor: "transparent",
    color: "var(--ink-dim)",
  },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
    backgroundColor: "color-mix(in srgb, var(--accent) 25%, transparent)",
  },
  ".cm-content ::selection": {
    backgroundColor: "color-mix(in srgb, var(--accent) 25%, transparent)",
  },
  ".cm-matchingBracket, &.cm-focused .cm-matchingBracket": {
    backgroundColor: "color-mix(in srgb, var(--accent) 18%, transparent)",
    outline: "1px solid var(--accent)",
  },
  ".cm-nonmatchingBracket": {
    color: "var(--accent)",
    backgroundColor: "transparent",
  },
  ".cm-foldPlaceholder": {
    backgroundColor: "transparent",
    color: "var(--ink-faint)",
    border: "1px dashed var(--ink-faint)",
    margin: "0 4px",
    padding: "0 4px",
  },
  ".cm-tooltip": {
    backgroundColor: "var(--bg-2)",
    border: "1px solid var(--ink-faint)",
    color: "var(--ink)",
    fontFamily: "var(--type-mono, monospace)",
    fontSize: "12px",
  },
  ".cm-panels": {
    backgroundColor: "var(--bg-2)",
    color: "var(--ink)",
    borderTop: "1px solid var(--ink-faint)",
  },
  ".cm-panel input, .cm-panel button": {
    fontFamily: "var(--type-mono, monospace)",
    fontSize: "12px",
    color: "var(--ink)",
    backgroundColor: "transparent",
    border: "1px solid var(--ink-faint)",
    padding: "4px 8px",
  },
  ".cm-searchMatch": {
    backgroundColor: "color-mix(in srgb, var(--accent) 22%, transparent)",
    outline: "1px solid var(--accent)",
  },
  ".cm-searchMatch.cm-searchMatch-selected": {
    backgroundColor: "color-mix(in srgb, var(--accent) 40%, transparent)",
  },
});

const portfolioHighlight = HighlightStyle.define([
  { tag: t.propertyName, color: "var(--accent)" },
  { tag: t.string, color: "var(--ink)" },
  { tag: t.number, color: "var(--ink-dim)", fontWeight: "600" },
  { tag: [t.bool, t.null], color: "var(--ink-dim)", fontStyle: "italic" },
  { tag: t.punctuation, color: "var(--ink-faint)" },
  { tag: t.brace, color: "var(--ink-faint)" },
  { tag: t.bracket, color: "var(--ink-faint)" },
]);

export function makeJsonExtensions(opts: {
  onSelectionEdit?: (info: JsonSelection) => void;
}): Extension[] {
  const base = [
    json(),
    portfolioTheme,
    syntaxHighlighting(portfolioHighlight),
    EditorView.lineWrapping,
  ];
  if (opts.onSelectionEdit) {
    base.push(selectionTooltip(opts.onSelectionEdit));
  }
  return base;
}
