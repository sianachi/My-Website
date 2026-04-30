import { marked } from "marked";
import DOMPurify from "dompurify";
import { slugify, uniqueSlug } from "@/shared/markdown/slug";

marked.setOptions({
  gfm: true,
  breaks: false,
});

export type BlogHeading = {
  id: string;
  text: string;
  level: number;
};

/**
 * Render markdown to sanitized HTML for the admin editor preview only.
 * The public reader receives pre-rendered HTML from the server (Shiki +
 * footnotes + heading IDs); this path is for the in-browser WYSIWYG.
 */
export function renderMarkdown(markdown: string): string {
  const rawHtml = marked.parse(markdown, { async: false }) as string;
  const sanitized = DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["target", "rel", "data-align"],
  });
  return injectHeadingIds(sanitized);
}

/**
 * Walk top-level markdown tokens and return H2 headings with stable slug IDs
 * matching the ones the server's renderPost injects, so ToC anchors resolve.
 */
export function extractHeadings(markdown: string): BlogHeading[] {
  const tokens = marked.lexer(markdown);
  const used = new Map<string, number>();
  const headings: BlogHeading[] = [];
  for (const tok of tokens) {
    if (tok.type !== "heading" || tok.depth !== 2) continue;
    const text = (tok.text ?? "").trim();
    if (!text) continue;
    headings.push({
      id: uniqueSlug(slugify(text), used),
      text,
      level: tok.depth,
    });
  }
  return headings;
}

function injectHeadingIds(html: string): string {
  const used = new Map<string, number>();
  return html.replace(
    /<h([1-6])>([\s\S]*?)<\/h\1>/g,
    (_match, level, inner) => {
      const text = inner.replace(/<[^>]+>/g, "").trim();
      if (!text) return `<h${level}>${inner}</h${level}>`;
      const slug = uniqueSlug(slugify(text), used);
      return `<h${level} id="${slug}">${inner}</h${level}>`;
    },
  );
}
