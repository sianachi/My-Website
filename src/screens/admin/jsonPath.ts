import type { EditorState } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import type { SyntaxNode } from "@lezer/common";

const VALUE_NODES = new Set([
  "Object",
  "Array",
  "String",
  "Number",
  "True",
  "False",
  "Null",
]);

export type JsonSelection = {
  path: (string | number)[];
  from: number;
  to: number;
};

export function pathFromCmSelection(state: EditorState): JsonSelection | null {
  const sel = state.selection.main;
  if (sel.from === sel.to) return null;
  const tree = syntaxTree(state);
  let node: SyntaxNode | null = tree.resolveInner(sel.from, 1);
  while (node && !(VALUE_NODES.has(node.name) && node.from <= sel.from && node.to >= sel.to)) {
    node = node.parent;
  }
  if (!node) return null;
  const path = pathOfNode(state, node);
  if (path === null) return null;
  return { path, from: node.from, to: node.to };
}

function pathOfNode(state: EditorState, node: SyntaxNode): (string | number)[] | null {
  const path: (string | number)[] = [];
  let cur: SyntaxNode | null = node;
  while (cur && cur.parent) {
    const parent: SyntaxNode = cur.parent;
    if (parent.name === "Property") {
      const keyNode = parent.firstChild;
      if (!keyNode || keyNode.name !== "PropertyName") return null;
      const raw = state.doc.sliceString(keyNode.from, keyNode.to);
      let key: string;
      try {
        key = JSON.parse(raw) as string;
      } catch {
        return null;
      }
      path.unshift(key);
      cur = parent.parent;
      continue;
    }
    if (parent.name === "Array") {
      let idx = 0;
      let sib: SyntaxNode | null = parent.firstChild;
      while (sib) {
        if (sib === cur) break;
        if (VALUE_NODES.has(sib.name)) idx += 1;
        sib = sib.nextSibling;
      }
      path.unshift(idx);
      cur = parent;
      continue;
    }
    cur = parent;
  }
  return path;
}

export function formatJsonPath(
  path: ReadonlyArray<string | number>,
): string {
  return path
    .map((seg) => (typeof seg === "number" ? `[${seg}]` : seg))
    .join(".");
}

export function replaceJsonRange(
  text: string,
  from: number,
  to: number,
  nextValue: unknown,
): string {
  const lineStart = text.lastIndexOf("\n", from - 1) + 1;
  const indentMatch = /^[\t ]*/.exec(text.slice(lineStart, from));
  const indent = indentMatch ? indentMatch[0] : "";
  const stringified = JSON.stringify(nextValue, null, 2);
  const reindented = stringified
    .split("\n")
    .map((line, i) => (i === 0 ? line : indent + line))
    .join("\n");
  return text.slice(0, from) + reindented + text.slice(to);
}
