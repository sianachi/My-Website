import { useCallback, useEffect, useState } from "react";
import {
  adminBlogApi,
  BlogApiError,
  type AdminBlogListItem,
} from "@/lib/blogApi";
import type { BlogStatus } from "@/shared/data/blog";

type Status =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "error"; message: string };

type Filter = "active" | "archived";

type Props = {
  onOpen: (slug: string) => void;
  onNew: () => void;
};

export function BlogManager({ onOpen, onNew }: Props) {
  const [posts, setPosts] = useState<AdminBlogListItem[]>([]);
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [filter, setFilter] = useState<Filter>("active");

  const load = useCallback(async () => {
    setStatus({ kind: "loading" });
    try {
      const data = await adminBlogApi.list();
      setPosts(data.posts);
      setStatus({ kind: "ready" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus({ kind: "error", message });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = posts.filter((p) =>
    filter === "active" ? p.status !== "archived" : p.status === "archived",
  );

  const counts = {
    active: posts.filter((p) => p.status !== "archived").length,
    archived: posts.filter((p) => p.status === "archived").length,
  };

  return (
    <section
      className="core-card core-card--wide"
      aria-labelledby="core-blog-heading"
    >
      <div className="core-section-head">
        <div>
          <p className="label label-accent core-meta">§ Blog</p>
          <h2 id="core-blog-heading" className="core-heading core-heading--sm">
            Manage posts.
          </h2>
        </div>
        <div className="core-toolbar">
          <button type="button" className="core-btn" onClick={onNew}>
            New post
          </button>
        </div>
      </div>
      <p className="core-body">
        Drafts and archived posts stay private. Published posts appear at{" "}
        <code>/blog</code>.
      </p>

      <div className="core-tabs" role="tablist" aria-label="Blog filter">
        <button
          type="button"
          role="tab"
          aria-selected={filter === "active"}
          className={
            "core-tab" + (filter === "active" ? " core-tab--active" : "")
          }
          onClick={() => setFilter("active")}
        >
          Active ({counts.active})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === "archived"}
          className={
            "core-tab" + (filter === "archived" ? " core-tab--active" : "")
          }
          onClick={() => setFilter("archived")}
        >
          Archived ({counts.archived})
        </button>
      </div>

      {status.kind === "loading" && <p className="core-body">Loading posts…</p>}
      {status.kind === "error" && (
        <p role="alert" className="core-error">
          Failed to load: {status.message}
        </p>
      )}

      {status.kind === "ready" && visible.length === 0 && (
        <p className="core-body">
          {filter === "active"
            ? "No posts yet. Hit “New post” to start."
            : "Nothing in the archive."}
        </p>
      )}

      {status.kind === "ready" && visible.length > 0 && (
        <ul className="core-post-list" role="list">
          {visible.map((post) => (
            <li key={post.slug}>
              <BlogRow
                post={post}
                onOpen={() => onOpen(post.slug)}
                onChanged={load}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function BlogRow({
  post,
  onOpen,
  onChanged,
}: {
  post: AdminBlogListItem;
  onOpen: () => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setStatus = async (next: BlogStatus) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await adminBlogApi.setStatus(post.slug, next);
      await onChanged();
    } catch (err) {
      const message =
        err instanceof BlogApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : String(err);
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="core-post-row">
      <div className="core-post-row__head">
        <button
          type="button"
          className="core-post-row__title"
          onClick={onOpen}
        >
          {post.title}
        </button>
        <StatusBadge status={post.status} />
      </div>
      <p className="core-post-row__meta">
        <code>{post.slug}</code> · updated {formatDate(post.updatedAt)}
        {post.publishedAt ? ` · published ${formatDate(post.publishedAt)}` : ""}
      </p>
      {post.excerpt && (
        <p className="core-post-row__excerpt">{post.excerpt}</p>
      )}
      <div className="core-actions">
        <button
          type="button"
          className="core-btn core-btn--ghost core-btn--xs"
          onClick={onOpen}
        >
          Edit
        </button>
        {post.status !== "archived" ? (
          <button
            type="button"
            className="core-btn core-btn--ghost core-btn--xs"
            disabled={busy}
            onClick={() => void setStatus("archived")}
          >
            Archive
          </button>
        ) : (
          <button
            type="button"
            className="core-btn core-btn--ghost core-btn--xs"
            disabled={busy}
            onClick={() => void setStatus("draft")}
          >
            Restore as draft
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="core-error">
          {error}
        </p>
      )}
    </article>
  );
}

function StatusBadge({ status }: { status: BlogStatus }) {
  return (
    <span className={`core-badge core-badge--${status}`}>{status}</span>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}
