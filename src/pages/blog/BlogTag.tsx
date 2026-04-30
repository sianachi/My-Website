import { useEffect, useState } from "react";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { usePalette } from "@/hooks/usePalette";
import { blogApi } from "@/lib/blogApi";
import { BlogHeader, BlogPostList } from "@/pages/blog/BlogIndex";
import type { BlogPostListItem } from "@/shared/data/blog";

type Status =
  | { kind: "loading" }
  | { kind: "ready"; posts: BlogPostListItem[] }
  | { kind: "error"; message: string };

type Props = {
  tag: string;
  navigate: (to: string) => void;
};

export function BlogTag({ tag, navigate }: Props) {
  const { toggle: toggleTheme } = usePalette();
  const [status, setStatus] = useState<Status>({ kind: "loading" });

  useDocumentMeta({
    title: `Posts tagged "${tag}" — Osinachi Nwagboso`,
    description: `Field-notes posts tagged ${tag}.`,
  });

  useEffect(() => {
    const ac = new AbortController();
    setStatus({ kind: "loading" });
    blogApi
      .list({ tag, signal: ac.signal })
      .then((data) => setStatus({ kind: "ready", posts: data.posts }))
      .catch((err) => {
        if (ac.signal.aborted) return;
        const message = err instanceof Error ? err.message : String(err);
        setStatus({ kind: "error", message });
      });
    return () => ac.abort();
  }, [tag]);

  return (
    <div className="blog-shell">
      <BlogHeader
        navigate={navigate}
        onThemeToggle={toggleTheme}
        backHref="/blog"
      />

      <main className="blog-page">
        <header className="blog-page__head">
          <p className="label label-accent">§ Tag</p>
          <h1 className="blog-page__title">
            Tagged <em>#{tag}</em>.
          </h1>
        </header>

        {status.kind === "loading" && (
          <p className="blog-empty">Loading posts…</p>
        )}
        {status.kind === "error" && (
          <p role="alert" className="blog-empty blog-empty--error">
            Couldn’t load: {status.message}
          </p>
        )}
        {status.kind === "ready" && status.posts.length === 0 && (
          <p className="blog-empty">
            No posts tagged <code>#{tag}</code> yet.
          </p>
        )}
        {status.kind === "ready" && status.posts.length > 0 && (
          <BlogPostList posts={status.posts} navigate={navigate} />
        )}
      </main>
    </div>
  );
}
