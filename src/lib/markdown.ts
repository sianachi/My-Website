import { marked } from "marked";
import DOMPurify from "dompurify";

marked.setOptions({
  gfm: true,
  breaks: false,
});

/**
 * Render markdown to sanitized HTML for the blog viewer + editor preview.
 * Sanitization runs in the browser (this module is only imported from
 * client code). Targets are author-trusted markdown, but DOMPurify is a
 * cheap belt-and-braces against `<script>`/`<style>` slipping through raw
 * HTML blocks.
 */
export function renderMarkdown(markdown: string): string {
  const rawHtml = marked.parse(markdown, { async: false }) as string;
  return DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["target", "rel", "data-align"],
  });
}
