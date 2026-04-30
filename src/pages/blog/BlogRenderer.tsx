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
    return DOMPurify.sanitize(raw, {
      USE_PROFILES: { html: true },
      ADD_ATTR: ["target", "rel", "data-align"],
      // Shiki output uses inline style + class for token colors.
      ADD_TAGS: [],
    });
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
