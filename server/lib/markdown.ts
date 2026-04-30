import { Marked } from "marked";
import markedShiki from "marked-shiki";
import markedFootnote from "marked-footnote";
import { getSingletonHighlighter, type Highlighter } from "shiki";
import { slugify, uniqueSlug } from "../../src/shared/markdown/slug.js";

export type RenderedPost = {
  html: string;
  readingMinutes: number;
  wordCount: number;
};

const LIGHT_THEME = "github-light";
const DARK_THEME = "github-dark";

// Preload the languages we expect to see in posts. Anything else falls back
// to "text" — Shiki throws on unknown langs and we don't want a single typo
// to take a post down.
const PRELOAD_LANGS = [
  "ts",
  "tsx",
  "js",
  "jsx",
  "json",
  "bash",
  "sh",
  "shell",
  "yaml",
  "yml",
  "md",
  "markdown",
  "sql",
  "py",
  "python",
  "rust",
  "go",
  "html",
  "css",
  "diff",
  "toml",
  "dockerfile",
  "ini",
  "xml",
  "csharp",
  "java",
];

let highlighterPromise: Promise<Highlighter> | null = null;
function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = getSingletonHighlighter({
      themes: [LIGHT_THEME, DARK_THEME],
      langs: PRELOAD_LANGS,
    });
  }
  return highlighterPromise;
}

let markedInstance: Marked | null = null;
function getMarked(): Marked {
  if (markedInstance) return markedInstance;
  const m = new Marked();
  m.setOptions({ gfm: true, breaks: false });
  m.use(markedFootnote());
  m.use(
    markedShiki({
      async highlight(code, lang) {
        const hl = await getHighlighter();
        const loaded = hl.getLoadedLanguages();
        const useLang = lang && loaded.includes(lang) ? lang : "text";
        return hl.codeToHtml(code, {
          lang: useLang,
          themes: { light: LIGHT_THEME, dark: DARK_THEME },
          defaultColor: false,
        });
      },
    }),
  );
  markedInstance = m;
  return m;
}

/**
 * Render a post body to the HTML the reader actually sees: marked + GFM,
 * footnotes, Shiki-highlighted fences, stable heading IDs, and ¶ permalink
 * anchors on h2/h3. Also returns reading time so callers can persist it.
 */
export async function renderPost(markdown: string): Promise<RenderedPost> {
  const m = getMarked();
  const rawHtml = (await m.parse(markdown)) as string;
  const withIds = injectHeadingIds(rawHtml);
  const html = injectHeadingAnchors(withIds);
  const wordCount = countWords(markdown);
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 220));
  return { html, readingMinutes, wordCount };
}

/**
 * Server-side markdown → HTML for crawler-visible <noscript> fallback.
 * Uses the same renderPost pipeline so the SSR copy matches what the
 * SPA paints.
 */
export async function renderMarkdownToHtml(markdown: string): Promise<string> {
  const out = await renderPost(markdown);
  return out.html;
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

function injectHeadingAnchors(html: string): string {
  return html.replace(
    /<h([23])\s+id="([^"]+)">([\s\S]*?)<\/h\1>/g,
    (_match, level, id, inner) =>
      `<h${level} id="${id}">${inner}<a class="blog-anchor" href="#${id}" aria-label="Link to this section">¶</a></h${level}>`,
  );
}

function countWords(markdown: string): number {
  // Strip fences, inline code, images/links syntax and HTML before counting.
  const stripped = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ");
  const tokens = stripped.match(/\b[\p{L}\p{N}'-]+\b/gu);
  return tokens ? tokens.length : 0;
}
