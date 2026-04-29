import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: false });

/**
 * Server-side markdown → HTML for crawler-visible <noscript> fallback.
 * Bodies are admin-authored markdown; the same source is sanitized via
 * DOMPurify when rendered in the browser by src/lib/markdown.ts.
 */
export function renderMarkdownToHtml(markdown: string): string {
  return marked.parse(markdown, { async: false }) as string;
}
