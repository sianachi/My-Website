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

  const total = status.kind === "ready" ? status.posts.length : 0;
  const year = new Date().getFullYear();

  return (
    <div className="blog-shell">
      <BlogHeader navigate={navigate} onThemeToggle={toggleTheme} />

      <BlogSpine total={pad(total)} />

      <main className="blog-page">
        <header className="blog-page__masthead">
          <p className="blog-page__masthead-mark">§ Field notes</p>
          <p className="blog-page__masthead-folio">
            {total} {total === 1 ? "post" : "posts"}
          </p>
          <p className="blog-page__masthead-year">{year}</p>
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
          <>
            <BlogPostList posts={status.posts} navigate={navigate} />
            <BlogTerminus />
          </>
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
  const total = posts.length;
  return (
    <ul className="blog-list" role="list">
      {posts.map((post, idx) => (
        <li key={post.slug}>
          <BlogPostCard
            post={post}
            navigate={navigate}
            ordinal={post.folio || total - idx}
          />
        </li>
      ))}
    </ul>
  );
}

function BlogPostCard({
  post,
  navigate,
  ordinal,
}: {
  post: BlogPostListItem;
  navigate: (to: string) => void;
  ordinal: number;
}) {
  const onLink = (event: React.MouseEvent<HTMLAnchorElement>, to: string) => {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.button !== 0
    )
      return;
    event.preventDefault();
    navigate(to);
  };

  const date = formatDate(post.publishedAt ?? post.updatedAt);
  const metaParts: string[] = [];
  if (post.readingMinutes) metaParts.push(`${post.readingMinutes} min`);
  if (date) metaParts.push(date);

  return (
    <article
      className={
        post.coverImage
          ? "blog-list__row blog-list__row--has-cover"
          : "blog-list__row"
      }
    >
      <span className="blog-list__ordinal" aria-hidden="true">
        {pad(ordinal)}
      </span>
      {post.coverImage && (
        <a
          className="blog-list__thumb-link"
          href={`/blog/${post.slug}`}
          onClick={(e) => onLink(e, `/blog/${post.slug}`)}
          aria-hidden="true"
          tabIndex={-1}
        >
          <figure className="blog-list__thumb">
            <img src={post.coverImage} alt="" loading="lazy" />
          </figure>
        </a>
      )}
      <div className="blog-list__body">
        <h2 className="blog-list__title">
          <a
            className="blog-list__title-link"
            href={`/blog/${post.slug}`}
            onClick={(e) => onLink(e, `/blog/${post.slug}`)}
          >
            {post.title}
          </a>
        </h2>
        {post.excerpt && (
          <p className="blog-list__excerpt">{post.excerpt}</p>
        )}
        {post.tags.length > 0 && (
          <ul className="blog-tag-row blog-tag-row--card" role="list">
            {post.tags.map((tag) => (
              <li key={tag}>
                <a
                  className="blog-tag-pill"
                  href={`/blog/tag/${tag}`}
                  onClick={(e) => onLink(e, `/blog/tag/${tag}`)}
                >
                  #{tag}
                </a>
              </li>
            ))}
          </ul>
        )}
        {metaParts.length > 0 && (
          <p className="blog-list__meta">
            {metaParts.map((part, i) => (
              <span key={i}>
                {i > 0 && <span className="blog-list__meta-sep">·</span>}
                {part}
              </span>
            ))}
          </p>
        )}
      </div>
    </article>
  );
}

function BlogSpine({ total }: { total: string }) {
  return (
    <div className="blog-page__spine" aria-hidden="true">
      <span className="blog-page__spine-folio">{total} posts</span>
    </div>
  );
}

/**
 * Constellation terminus glyph — a small typographic mark closing the index.
 * Hand-built SVG: a horizontal trail, three accent stars, a centre lozenge.
 */
function BlogTerminus() {
  return (
    <div className="blog-page__terminus" aria-hidden="true">
      <svg viewBox="0 0 96 18" xmlns="http://www.w3.org/2000/svg">
        <path className="pd-trail" d="M2 9 H38" />
        <path className="pd-trail" d="M58 9 H94" />
        <circle className="pd-star" cx="14" cy="9" r="1.4" />
        <circle className="pd-star" cx="82" cy="9" r="1.4" />
        <path className="pd-mark" d="M48 4 L52 9 L48 14 L44 9 Z" />
        <circle className="pd-star" cx="48" cy="9" r="0.9" />
      </svg>
    </div>
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

function pad(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(3, "0");
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
