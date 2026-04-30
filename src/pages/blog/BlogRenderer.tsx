import { useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { renderMarkdown } from "@/lib/markdown";

type Props = {
  /**
   * Server-rendered HTML — preferred. Includes Shiki-highlighted fences,
   * footnotes, heading IDs, and ¶ permalink anchors.
   */
  html?: string;
  /**
   * Markdown source — fallback used only when the server `html` is missing
   * (e.g. older API response). Reader still works without code highlighting.
   */
  markdown?: string;
};

export function BlogRenderer({ html, markdown }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copiedAt, setCopiedAt] = useState<{ left: number; top: number } | null>(
    null,
  );

  const sanitized = useMemo(() => {
    const raw = html ?? (markdown ? renderMarkdown(markdown) : "");
    const cleaned = DOMPurify.sanitize(raw, {
      USE_PROFILES: { html: true },
      ADD_ATTR: ["target", "rel", "data-align"],
      // Shiki output uses inline style + class for token colors.
      ADD_TAGS: [],
    });
    return injectDropCap(cleaned);
  }, [html, markdown]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const onClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement | null)?.closest(
        ".blog-anchor",
      ) as HTMLAnchorElement | null;
      if (!target) return;
      const id = target.getAttribute("href")?.replace(/^#/, "");
      if (!id) return;
      event.preventDefault();
      const url = `${window.location.origin}${window.location.pathname}#${id}`;
      navigator.clipboard?.writeText(url).catch(() => {});
      history.replaceState(null, "", `#${id}`);
      const heading = document.getElementById(id);
      if (heading) {
        const top = heading.getBoundingClientRect().top + window.scrollY - 90;
        window.scrollTo({ top, behavior: "smooth" });
      }
      const rect = target.getBoundingClientRect();
      setCopiedAt({ left: rect.left + window.scrollX, top: rect.top + window.scrollY });
      window.setTimeout(() => setCopiedAt(null), 1400);
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [sanitized]);

  return (
    <>
      <div
        ref={containerRef}
        className="blog-prose"
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
      {copiedAt && (
        <span
          className="blog-anchor-toast"
          style={{ left: copiedAt.left, top: copiedAt.top }}
          role="status"
        >
          Link copied
        </span>
      )}
    </>
  );
}

/**
 * Wrap the first grapheme of the leading paragraph in a drop-cap span. Skips
 * silently if the article opens with a heading, image, blockquote, or anything
 * other than a <p> — we don't want to drop-cap a section title or punctuation.
 *
 * ::first-letter is unreliable across the variety of leading content the
 * markdown pipeline produces (footnote refs, inline anchors, smart quotes),
 * so we do it in JS once after sanitization.
 */
function injectDropCap(htmlString: string): string {
  if (!htmlString || typeof DOMParser === "undefined") return htmlString;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<body>${htmlString}</body>`, "text/html");
    const body = doc.body;
    const first = body.firstElementChild;
    if (!first || first.tagName !== "P") return htmlString;

    // Walk to the first text node inside the paragraph. Skip if there's no
    // usable leading text (e.g. paragraph starts with an inline image or a
    // footnote ref).
    const walker = doc.createTreeWalker(first, NodeFilter.SHOW_TEXT);
    const textNode = walker.nextNode() as Text | null;
    if (!textNode || !textNode.data) return htmlString;

    // Take the first grapheme via Array.from to handle combining marks +
    // surrogate pairs. Skip leading whitespace; require a letter as the cap.
    const graphemes = Array.from(textNode.data);
    let i = 0;
    let leadingWs = "";
    while (i < graphemes.length && /\s/.test(graphemes[i])) {
      leadingWs += graphemes[i];
      i += 1;
    }
    if (i >= graphemes.length) return htmlString;
    const cap = graphemes[i];
    if (!/\p{L}/u.test(cap)) return htmlString;
    const tail = graphemes.slice(i + 1).join("");

    const span = doc.createElement("span");
    span.className = "blog-prose__dropcap";
    span.textContent = cap;

    const parent = textNode.parentNode!;
    const tailNode = doc.createTextNode(tail);
    parent.insertBefore(tailNode, textNode);
    parent.insertBefore(span, tailNode);
    if (leadingWs) parent.insertBefore(doc.createTextNode(leadingWs), span);
    parent.removeChild(textNode);

    return body.innerHTML;
  } catch {
    return htmlString;
  }
}
