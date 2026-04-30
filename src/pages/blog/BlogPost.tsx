import { useEffect, useMemo, useState } from "react";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { usePalette } from "@/hooks/usePalette";
import { blogApi } from "@/lib/blogApi";
import { extractHeadings } from "@/lib/markdown";
import { BlogHeader } from "@/pages/blog/BlogIndex";
import { BlogProgress } from "@/pages/blog/BlogProgress";
import { BlogRenderer } from "@/pages/blog/BlogRenderer";
import { BlogToc } from "@/pages/blog/BlogToc";
import { BlogPostNav } from "@/pages/blog/BlogPostNav";
import { BlogRelated } from "@/pages/blog/BlogRelated";
import type { BlogPost as BlogPostType } from "@/shared/data/blog";

type Status =
  | { kind: "loading" }
  | { kind: "ready"; post: BlogPostType }
  | { kind: "not-found" }
  | { kind: "error"; message: string };

type Props = {
  slug: string;
  navigate: (to: string) => void;
};

export function BlogPost({ slug, navigate }: Props) {
  const { toggle: toggleTheme } = usePalette();
  const [status, setStatus] = useState<Status>({ kind: "loading" });

  const metaTitle =
    status.kind === "ready"
      ? `${status.post.title} — Osinachi Nwagboso`
      : "Loading… — Osinachi Nwagboso";
  const metaDescription =
    status.kind === "ready" && status.post.excerpt
      ? status.post.excerpt
      : undefined;
  useDocumentMeta({ title: metaTitle, description: metaDescription });

  const headings = useMemo(
    () => (status.kind === "ready" ? extractHeadings(status.post.content) : []),
    [status],
  );

  useEffect(() => {
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
  }, [slug]);

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
              <div className="blog-article__body">
                <BlogToc headings={headings} />
                <BlogRenderer
                  html={status.post.html}
                  markdown={status.post.content}
                />
              </div>
              <footer className="blog-article__foot">
                <BlogPostNav slug={slug} navigate={navigate} />
                <BlogRelated slug={slug} navigate={navigate} />
              </footer>
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
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}
