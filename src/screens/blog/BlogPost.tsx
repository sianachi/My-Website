"use client";

import { useEffect, useMemo, useState } from "react";
import { useRoute } from "@/hooks/useRoute";
import { usePalette } from "@/hooks/usePalette";
import { blogApi } from "@/lib/blogApi";
import { extractHeadings } from "@/lib/markdown";
import { BlogHeader } from "@/screens/blog/BlogIndex";
import { BlogProgress } from "@/screens/blog/BlogProgress";
import { BlogRenderer } from "@/screens/blog/BlogRenderer";
import { BlogToc } from "@/screens/blog/BlogToc";
import { BlogPostNav } from "@/screens/blog/BlogPostNav";
import { BlogRelated } from "@/screens/blog/BlogRelated";
import type { BlogPost as BlogPostType } from "@/shared/data/blog";

type Status =
  | { kind: "loading" }
  | { kind: "ready"; post: BlogPostType }
  | { kind: "not-found" }
  | { kind: "error"; message: string };

type Props = {
  slug: string;
  /** Post fetched server-side; when present it renders without a fetch. */
  initialPost?: BlogPostType;
};

export function BlogPost({ slug, initialPost }: Props) {
  const { navigate } = useRoute();
  const { toggle: toggleTheme } = usePalette();
  const [status, setStatus] = useState<Status>(
    initialPost ? { kind: "ready", post: initialPost } : { kind: "loading" },
  );

  const headings = useMemo(
    () => (status.kind === "ready" ? extractHeadings(status.post.content) : []),
    [status],
  );

  useEffect(() => {
    if (initialPost) return;
    const ac = new AbortController();
    setStatus({ kind: "loading" });
    blogApi
      .get(slug, ac.signal)
      .then((post) => setStatus({ kind: "ready", post }))
      .catch((err) => {
        if (ac.signal.aborted) return;
        const message = err instanceof Error ? err.message : String(err);
        if (/responded 404/.test(message)) {
          setStatus({ kind: "not-found" });
        } else {
          setStatus({ kind: "error", message });
        }
      });
    return () => ac.abort();
  }, [slug, initialPost]);

  return (
    <div className="blog-shell">
      <BlogHeader
        navigate={navigate}
        onThemeToggle={toggleTheme}
        backHref="/blog"
      />

      {status.kind === "ready" ? (
        <>
          <BlogProgress />
          <main>
            <article className="blog-article">
              <div className="blog-article__page">
              {status.post.folio > 0 && (
                <div className="blog-folio-corner" aria-hidden="true">
                  No. {pad(status.post.folio)}
                  {status.post.folioTotal > 0 ? ` / ${pad(status.post.folioTotal)}` : ""}
                </div>
              )}
              {status.post.coverImage && (
                <figure className="blog-cover">
                  <img src={status.post.coverImage} alt="" loading="eager" />
                </figure>
              )}
              <header className="blog-article__head">
                <p className="label label-accent">
                  § {formatDate(status.post.publishedAt ?? status.post.updatedAt)}
                  {status.post.readingMinutes
                    ? ` · ${status.post.readingMinutes} min read`
                    : ""}
                </p>
                <h1 className="blog-article__title">{status.post.title}</h1>
                {status.post.excerpt && (
                  <p className="blog-article__lede">{status.post.excerpt}</p>
                )}
                {status.post.tags.length > 0 && (
                  <ul className="blog-tag-row" role="list">
                    {status.post.tags.map((tag) => (
                      <li key={tag}>
                        <a
                          className="blog-tag-pill"
                          href={`/blog/tag/${tag}`}
                          onClick={(e) => {
                            if (
                              e.metaKey ||
                              e.ctrlKey ||
                              e.shiftKey ||
                              e.button !== 0
                            )
                              return;
                            e.preventDefault();
                            navigate(`/blog/tag/${tag}`);
                          }}
                        >
                          #{tag}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </header>
              <BlogToc headings={headings} variant="inline" />
              <div className="blog-article__body">
                <BlogToc headings={headings} />
                <BlogRenderer
                  html={status.post.html}
                  markdown={status.post.content}
                />
              </div>
              <footer className="blog-article__foot">
                <a
                  className="blog-back-to-top"
                  href="#top"
                  onClick={(e) => {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  <span className="blog-back-to-top__rule" aria-hidden="true" />
                  <span className="blog-back-to-top__label">
                    Back to top
                  </span>
                </a>
                <BlogPostNav slug={slug} navigate={navigate} />
                <BlogRelated slug={slug} navigate={navigate} />
              </footer>
              </div>
            </article>
          </main>
        </>
      ) : (
        <main className="blog-page">
          {status.kind === "loading" && (
            <p className="blog-empty">Loading post…</p>
          )}
          {status.kind === "not-found" && (
            <div className="blog-empty">
              <p className="label label-accent">§ 404</p>
              <h1 className="blog-page__title">Post not found.</h1>
              <p>
                The post you’re looking for might have been archived. Try the{" "}
                <a
                  href="/blog"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/blog");
                  }}
                >
                  index
                </a>
                .
              </p>
            </div>
          )}
          {status.kind === "error" && (
            <p role="alert" className="blog-empty blog-empty--error">
              Couldn’t load: {status.message}
            </p>
          )}
        </main>
      )}
    </div>
  );
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}.${m}.${day}`;
  } catch {
    return iso;
  }
}

function pad(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(3, "0");
}
