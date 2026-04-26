import { useEffect, useMemo, useRef, useState } from "react";
import {
  adminBlogApi,
  BlogApiError,
  type ZodIssueLite,
} from "@/lib/blogApi";
import {
  BlogSlugSchema,
  slugify,
  type BlogPost,
  type BlogStatus,
} from "@/shared/data/blog";
import {
  BlogFileExplorer,
  type BlogFileExplorerHandle,
} from "@/pages/admin/BlogFileExplorer";
import {
  BlogRichEditor,
  type BlogRichEditorHandle,
} from "@/pages/admin/BlogRichEditor";

type LoadStatus =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "error"; message: string };

type SaveStatus =
  | { kind: "idle" }
  | { kind: "saving"; label: string }
  | { kind: "saved"; at: string; label: string }
  | { kind: "error"; message: string; issues: ZodIssueLite[] };

type Props = {
  initialSlug: string | null;
  onClose: () => void;
  onCreated: (slug: string) => void;
};

export function BlogEditor({ initialSlug, onClose, onCreated }: Props) {
  const isNew = initialSlug === null;
  const editorRef = useRef<BlogRichEditorHandle | null>(null);
  const explorerRef = useRef<BlogFileExplorerHandle | null>(null);

  const [post, setPost] = useState<BlogPost | null>(null);
  const [title, setTitle] = useState("");
  const [originalTitle, setOriginalTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [originalExcerpt, setOriginalExcerpt] = useState("");
  const [initialMarkdown, setInitialMarkdown] = useState("");
  const [editorDirty, setEditorDirty] = useState(false);

  const [load, setLoad] = useState<LoadStatus>(
    isNew ? { kind: "ready" } : { kind: "loading" },
  );
  const [save, setSave] = useState<SaveStatus>({ kind: "idle" });

  useEffect(() => {
    if (isNew || !initialSlug) return;
    let cancelled = false;
    setLoad({ kind: "loading" });
    adminBlogApi
      .get(initialSlug)
      .then((data) => {
        if (cancelled) return;
        setPost(data);
        setTitle(data.title);
        setOriginalTitle(data.title);
        setSlug(data.slug);
        setExcerpt(data.excerpt ?? "");
        setOriginalExcerpt(data.excerpt ?? "");
        setInitialMarkdown(data.content);
        setEditorDirty(false);
        setLoad({ kind: "ready" });
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setLoad({ kind: "error", message });
      });
    return () => {
      cancelled = true;
    };
  }, [isNew, initialSlug]);

  useEffect(() => {
    if (!isNew || slugTouched) return;
    setSlug(slugify(title));
  }, [title, isNew, slugTouched]);

  const dirty = useMemo(() => {
    if (isNew) return title.length > 0 || editorDirty;
    return (
      title !== originalTitle ||
      excerpt !== originalExcerpt ||
      editorDirty
    );
  }, [isNew, title, excerpt, originalTitle, originalExcerpt, editorDirty]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const submitCreate = async () => {
    const slugCheck = BlogSlugSchema.safeParse(slug);
    if (!slugCheck.success) {
      setSave({
        kind: "error",
        message: `Slug invalid: ${slugCheck.error.issues[0]?.message ?? "fix it"}`,
        issues: [],
      });
      return;
    }
    if (!title.trim()) {
      setSave({ kind: "error", message: "Title is required.", issues: [] });
      return;
    }
    setSave({ kind: "saving", label: "Creating" });
    try {
      const markdown = editorRef.current?.getMarkdown() ?? "";
      const created = await adminBlogApi.create({
        slug: slugCheck.data,
        title: title.trim(),
        excerpt: excerpt.trim() || undefined,
        content: markdown,
      });
      setPost(created);
      setOriginalTitle(created.title);
      setOriginalExcerpt(created.excerpt ?? "");
      editorRef.current?.setMarkdown(created.content);
      setEditorDirty(false);
      setSave({ kind: "saved", at: formatTime(new Date()), label: "Created" });
      onCreated(created.slug);
    } catch (err) {
      handleSaveError(err, setSave);
    }
  };

  const submitUpdate = async (patch?: { status?: BlogStatus }) => {
    if (!post) return;
    const label =
      patch?.status === "published"
        ? "Publishing"
        : patch?.status === "archived"
          ? "Archiving"
          : patch?.status === "draft"
            ? "Updating"
            : "Saving";
    setSave({ kind: "saving", label });
    try {
      const markdown = editorRef.current?.getMarkdown() ?? "";
      const updated = await adminBlogApi.update(post.slug, {
        title: title.trim(),
        excerpt: excerpt.trim(),
        content: markdown,
        ...(patch?.status ? { status: patch.status } : {}),
      });
      setPost(updated);
      setTitle(updated.title);
      setOriginalTitle(updated.title);
      setExcerpt(updated.excerpt ?? "");
      setOriginalExcerpt(updated.excerpt ?? "");
      editorRef.current?.setMarkdown(updated.content);
      setEditorDirty(false);
      setSave({
        kind: "saved",
        at: formatTime(new Date()),
        label: label === "Saving" ? "Saved" : label.replace(/ing$/, "ed"),
      });
    } catch (err) {
      handleSaveError(err, setSave);
    }
  };

  if (load.kind === "loading") {
    return (
      <section className="core-card core-card--wide">
        <p className="core-body">Loading post…</p>
      </section>
    );
  }
  if (load.kind === "error") {
    return (
      <section className="core-card core-card--wide">
        <p role="alert" className="core-error">
          Failed to load: {load.message}
        </p>
        <div className="core-actions">
          <button
            type="button"
            className="core-btn core-btn--ghost"
            onClick={onClose}
          >
            ← Back
          </button>
        </div>
      </section>
    );
  }

  const saving = save.kind === "saving";
  const status: BlogStatus = post?.status ?? "draft";

  return (
    <section className="core-card core-card--wide core-blog-editor">
      <div className="core-section-head">
        <div>
          <p className="label label-accent core-meta">
            § Blog · {isNew ? "New post" : "Edit"}
          </p>
          <h2 className="core-heading core-heading--sm">
            {title || (isNew ? "Untitled draft" : "Untitled")}
          </h2>
        </div>
        <div className="core-toolbar">
          {!isNew && (
            <span className={`core-badge core-badge--${status}`}>{status}</span>
          )}
        </div>
      </div>

      <div className="core-blog-meta">
        <label className="core-field">
          <span className="core-field__label">Title</span>
          <input
            type="text"
            className="core-form-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled draft"
            disabled={saving}
          />
        </label>
        <label className="core-field">
          <span className="core-field__label">Slug</span>
          <input
            type="text"
            className="core-form-input"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            placeholder="my-first-post"
            disabled={!isNew || saving}
            readOnly={!isNew}
          />
          {!isNew && (
            <span className="core-field__hint">
              Slug is permanent — set on create.
            </span>
          )}
        </label>
        <label className="core-field core-field--wide">
          <span className="core-field__label">Excerpt (optional)</span>
          <input
            type="text"
            className="core-form-input"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="One-line summary, shown on the index page"
            maxLength={280}
            disabled={saving}
          />
        </label>
      </div>

      <BlogRichEditor
        ref={editorRef}
        initialMarkdown={initialMarkdown}
        slug={post?.slug ?? null}
        onChange={() => setEditorDirty(true)}
        onAssetUploaded={() => explorerRef.current?.refresh()}
        disabled={saving}
      />

      <BlogFileExplorer
        ref={explorerRef}
        slug={post?.slug ?? null}
        onInsertImage={(url, alt) => editorRef.current?.insertImage(url, alt)}
        onInsertLink={(url, label) => editorRef.current?.insertLink(url, label)}
      />

      <div className="core-actions">
        <button
          type="button"
          className="core-btn core-btn--ghost"
          onClick={onClose}
          disabled={saving}
        >
          ← Back
        </button>
        {isNew ? (
          <button
            type="button"
            className="core-btn"
            onClick={() => void submitCreate()}
            disabled={saving || !title.trim() || !slug}
          >
            {saving ? `${save.label}…` : "Create draft"}
          </button>
        ) : (
          <>
            <button
              type="button"
              className="core-btn"
              onClick={() => void submitUpdate()}
              disabled={saving || !dirty}
            >
              {saving && save.label === "Saving"
                ? "Saving…"
                : "Save changes"}
            </button>
            {status !== "published" && (
              <button
                type="button"
                className="core-btn core-btn--ghost"
                onClick={() => void submitUpdate({ status: "published" })}
                disabled={saving || !title.trim()}
              >
                {saving && save.label === "Publishing"
                  ? "Publishing…"
                  : "Publish"}
              </button>
            )}
            {status === "published" && (
              <button
                type="button"
                className="core-btn core-btn--ghost"
                onClick={() => void submitUpdate({ status: "draft" })}
                disabled={saving}
              >
                Unpublish
              </button>
            )}
            {status !== "archived" ? (
              <button
                type="button"
                className="core-btn core-btn--ghost"
                onClick={() => void submitUpdate({ status: "archived" })}
                disabled={saving}
              >
                Archive
              </button>
            ) : (
              <button
                type="button"
                className="core-btn core-btn--ghost"
                onClick={() => void submitUpdate({ status: "draft" })}
                disabled={saving}
              >
                Restore as draft
              </button>
            )}
          </>
        )}
      </div>

      {save.kind === "saved" && (
        <p className="core-status">
          {save.label} at {save.at}.
        </p>
      )}
      {save.kind === "error" && (
        <div role="alert" className="core-error-block">
          <p className="core-error">{save.message}</p>
          {save.issues.length > 0 && (
            <ul className="core-issue-list">
              {save.issues.slice(0, 5).map((issue, i) => (
                <li key={i}>
                  <code>{issue.path.join(".") || "(root)"}</code>:{" "}
                  {issue.message}
                </li>
              ))}
              {save.issues.length > 5 && (
                <li>…{save.issues.length - 5} more</li>
              )}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour12: false });
}

function handleSaveError(
  err: unknown,
  setSave: (next: SaveStatus) => void,
): void {
  if (err instanceof BlogApiError) {
    setSave({ kind: "error", message: err.message, issues: err.issues });
  } else {
    const message = err instanceof Error ? err.message : String(err);
    setSave({ kind: "error", message, issues: [] });
  }
}
