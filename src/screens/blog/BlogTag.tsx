"use client";

import { useEffect, useState } from "react";
import { useRoute } from "@/hooks/useRoute";
import { usePalette } from "@/hooks/usePalette";
import { blogApi } from "@/lib/blogApi";
import { BlogHeader, BlogPostList } from "@/screens/blog/BlogIndex";
import type { BlogPostListItem } from "@/shared/data/blog";

type Status =
  | { kind: "loading" }
  | { kind: "ready"; posts: BlogPostListItem[] }
  | { kind: "error"; message: string };

type Props = {
  tag: string;
  /** Posts fetched server-side; when present the list renders without a fetch. */
  initialPosts?: BlogPostListItem[];
};

export function BlogTag({ tag, initialPosts }: Props) {
  const { navigate } = useRoute();
  const { toggle: toggleTheme } = usePalette();
  const [status, setStatus] = useState<Status>(
    initialPosts
      ? { kind: "ready", posts: initialPosts }
      : { kind: "loading" },
  );

  useEffect(() => {
    if (initialPosts) return;
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
  }, [tag, initialPosts]);

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
