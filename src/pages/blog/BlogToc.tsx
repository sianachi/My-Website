import { useEffect, useState } from "react";
import type { BlogHeading } from "@/lib/markdown";

const STICKY_OFFSET = 90;

type Variant = "rail" | "inline";

type Props = {
  headings: BlogHeading[];
  /**
   * `rail` — sticky desktop ToC (hidden below 960px via blog.css media query).
   * `inline` — mobile-only collapsible <details> placed above the prose;
   * hidden at the same desktop breakpoint so the two never compete.
   */
  variant?: Variant;
};

export function BlogToc({ headings, variant = "rail" }: Props) {
  const [activeId, setActiveId] = useState<string>(headings[0]?.id ?? "");

  useEffect(() => {
    if (variant !== "rail") return; // active tracking only matters for the rail
    if (headings.length < 2) return;
    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          setActiveId(visible[0].target.id);
          return;
        }
        const above = entries
          .filter((e) => e.boundingClientRect.top < STICKY_OFFSET)
          .sort((a, b) => b.boundingClientRect.top - a.boundingClientRect.top);
        if (above[0]) setActiveId(above[0].target.id);
      },
      { rootMargin: `-${STICKY_OFFSET}px 0px -60% 0px`, threshold: 0 },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings, variant]);

  if (headings.length < 2) return null;

  const onClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    const top = el.getBoundingClientRect().top + window.scrollY - STICKY_OFFSET;
    window.scrollTo({ top, behavior: "smooth" });
    history.replaceState(null, "", `#${id}`);
    setActiveId(id);
    // On the inline (mobile) variant, collapse the <details> after picking.
    if (variant === "inline") {
      const details = e.currentTarget.closest("details");
      if (details) details.open = false;
    }
  };

  if (variant === "inline") {
    return (
      <details className="blog-toc-inline">
        <summary className="blog-toc-inline__summary">
          <span className="blog-toc-inline__label">Contents</span>
          <span className="blog-toc-inline__count">
            {headings.length} {headings.length === 1 ? "section" : "sections"}
          </span>
        </summary>
        <ol className="blog-toc-inline__list">
          {headings.map((h) => (
            <li key={h.id} className="blog-toc-inline__item">
              <a
                href={`#${h.id}`}
                className="blog-toc-inline__link"
                onClick={(e) => onClick(e, h.id)}
              >
                {h.text}
              </a>
            </li>
          ))}
        </ol>
      </details>
    );
  }

  return (
    <nav className="blog-toc" aria-label="Table of contents">
      <p className="blog-toc__label">Contents</p>
      <ol className="blog-toc__list">
        {headings.map((h) => (
          <li
            key={h.id}
            className={
              h.id === activeId
                ? "blog-toc__item blog-toc__item--active"
                : "blog-toc__item"
            }
          >
            <a
              href={`#${h.id}`}
              className="blog-toc__link"
              onClick={(e) => onClick(e, h.id)}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
