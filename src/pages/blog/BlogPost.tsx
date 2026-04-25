import { useEffect, useState } from "react";
import { usePalette } from "@/hooks/usePalette";
import { blogApi } from "@/lib/blogApi";
import { BlogHeader } from "@/pages/blog/BlogIndex";
import { BlogRenderer } from "@/pages/blog/BlogRenderer";
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
        {status.kind === "ready" && (
          <article className="blog-article">
            <header className="blog-article__head">
              <p className="label label-accent">
                § {formatDate(status.post.publishedAt ?? status.post.updatedAt)}
              </p>
              <h1 className="blog-article__title">{status.post.title}</h1>
              {status.post.excerpt && (
                <p className="blog-article__lede">{status.post.excerpt}</p>
              )}
            </header>
            <BlogRenderer html={status.post.content} />
          </article>
        )}
      </main>
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
