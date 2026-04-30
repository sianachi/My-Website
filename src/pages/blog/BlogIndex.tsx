import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { usePalette } from "@/hooks/usePalette";
import { blogApi } from "@/lib/blogApi";
import type { BlogPostListItem } from "@/shared/data/blog";

type Status =
  | { kind: "loading" }
  | { kind: "ready"; posts: BlogPostListItem[] }
  | { kind: "error"; message: string };

type Props = {
  navigate: (to: string) => void;
};

export function BlogIndex({ navigate }: Props) {
  const { toggle: toggleTheme } = usePalette();
  const [status, setStatus] = useState<Status>({ kind: "loading" });

  useDocumentMeta({
    title: "Field notes — Osinachi Nwagboso",
    description:
      "Writing on backend systems, edge infrastructure, and engineering practice.",
  });

  useEffect(() => {
    const ac = new AbortController();
    blogApi
      .list({ signal: ac.signal })
      .then((data) => setStatus({ kind: "ready", posts: data.posts }))
      .catch((err) => {
        if (ac.signal.aborted) return;
        const message = err instanceof Error ? err.message : String(err);
        setStatus({ kind: "error", message });
      });
    return () => ac.abort();
  }, []);

  return (
    <div className="blog-shell">
      <BlogHeader navigate={navigate} onThemeToggle={toggleTheme} />

      <main className="blog-page">
        <header className="blog-page__head">
          <p className="label label-accent">§ Field notes</p>
          <h1 className="blog-page__title">
            Writing on <em>practice</em>.
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
          <p className="blog-empty">No posts yet — check back soon.</p>
        )}
        {status.kind === "ready" && status.posts.length > 0 && (
          <BlogPostList posts={status.posts} navigate={navigate} />
        )}
      </main>
    </div>
  );
}

export function BlogPostList({
  posts,
  navigate,
}: {
  posts: BlogPostListItem[];
  navigate: (to: string) => void;
}) {
  return (
    <ul className="blog-list" role="list">
      {posts.map((post) => (
        <li key={post.slug}>
          <BlogPostCard post={post} navigate={navigate} />
        </li>
      ))}
    </ul>
  );
}

function BlogPostCard({
  post,
  navigate,
}: {
  post: BlogPostListItem;
  navigate: (to: string) => void;
}) {
  return (
    <article
      className={
        post.coverImage
          ? "blog-list__item blog-list__item--has-cover"
          : "blog-list__item"
      }
    >
      <a
        className="blog-list__link"
        href={`/blog/${post.slug}`}
        onClick={(event) => {
          if (
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.button !== 0
          )
            return;
          event.preventDefault();
          navigate(`/blog/${post.slug}`);
        }}
      >
        {post.coverImage && (
          <figure className="blog-list__thumb">
            <img src={post.coverImage} alt="" loading="lazy" />
          </figure>
        )}
        <div className="blog-list__body">
          <h2 className="blog-list__title">{post.title}</h2>
          {post.excerpt && (
            <p className="blog-list__excerpt">{post.excerpt}</p>
          )}
          <p className="blog-list__meta">
            {formatDate(post.publishedAt ?? post.updatedAt)}
            {post.readingMinutes ? ` · ${post.readingMinutes} min read` : ""}
          </p>
          {post.tags.length > 0 && (
            <ul className="blog-tag-row blog-tag-row--card" role="list">
              {post.tags.map((tag) => (
                <li key={tag}>
                  <span className="blog-tag-pill">#{tag}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </a>
    </article>
  );
}

export function BlogHeader({
  navigate,
  onThemeToggle,
  backHref = "/",
}: {
  navigate: (to: string) => void;
  onThemeToggle: () => void;
  backHref?: string;
}) {
  return (
    <header className="blog-bar">
      <a
        className="blog-bar__mark"
        href="/"
        onClick={(event) => {
          if (
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.button !== 0
          )
            return;
          event.preventDefault();
          navigate("/");
        }}
      >
        Osinachi · 2026
      </a>
      <div className="blog-bar__chrome">
        <a
          className="blog-bar__back"
          href={backHref}
          onClick={(event) => {
            if (
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey ||
              event.button !== 0
            )
              return;
            event.preventDefault();
            navigate(backHref);
          }}
        >
          {backHref === "/" ? "← Home" : "← All posts"}
        </a>
        <ThemeToggle onToggle={onThemeToggle} />
      </div>
    </header>
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
