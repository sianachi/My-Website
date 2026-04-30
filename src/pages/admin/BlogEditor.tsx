import { useEffect, useMemo, useRef, useState } from "react";
import {
  adminBlogApi,
  BlogApiError,
  type ZodIssueLite,
} from "@/lib/blogApi";
import {
  BlogSlugSchema,
  normalizeTags,
  slugify,
  type BlogPost,
  type BlogStatus,
} from "@/shared/data/blog";
import { presignAndUpload } from "@/lib/uploads";
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
  const [tags, setTags] = useState<string[]>([]);
  const [originalTags, setOriginalTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [coverImage, setCoverImage] = useState<string>("");
  const [originalCoverImage, setOriginalCoverImage] = useState<string>("");
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
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
        setTags(data.tags ?? []);
        setOriginalTags(data.tags ?? []);
        setCoverImage(data.coverImage ?? "");
        setOriginalCoverImage(data.coverImage ?? "");
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
    if (isNew) return title.length > 0 || editorDirty || tags.length > 0;
    return (
      title !== originalTitle ||
      excerpt !== originalExcerpt ||
      coverImage !== originalCoverImage ||
      !arraysEqual(tags, originalTags) ||
      editorDirty
    );
  }, [
    isNew,
    title,
    excerpt,
    coverImage,
    tags,
    originalTitle,
    originalExcerpt,
    originalCoverImage,
    originalTags,
    editorDirty,
  ]);

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
        tags: normalizeTags(commitTagDraft(tags, tagDraft)),
      });
      setPost(created);
      setOriginalTitle(created.title);
      setOriginalExcerpt(created.excerpt ?? "");
      setTags(created.tags);
      setOriginalTags(created.tags);
      setTagDraft("");
      setCoverImage(created.coverImage ?? "");
      setOriginalCoverImage(created.coverImage ?? "");
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
      const finalTags = normalizeTags(commitTagDraft(tags, tagDraft));
      const updated = await adminBlogApi.update(post.slug, {
        title: title.trim(),
        excerpt: excerpt.trim(),
        content: markdown,
        tags: finalTags,
        coverImage: coverImage,
        ...(patch?.status ? { status: patch.status } : {}),
      });
      setPost(updated);
      setTitle(updated.title);
      setOriginalTitle(updated.title);
      setExcerpt(updated.excerpt ?? "");
      setOriginalExcerpt(updated.excerpt ?? "");
      setTags(updated.tags);
      setOriginalTags(updated.tags);
      setTagDraft("");
      setCoverImage(updated.coverImage ?? "");
      setOriginalCoverImage(updated.coverImage ?? "");
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

  const folioLabel = post && post.folio > 0
    ? `No. ${pad(post.folio)}`
    : isNew
      ? "New post"
      : "Post";
  const proofSavedLabel = save.kind === "saved" ? `Last saved ${save.at}` : "—";

  return (
    <section className="core-card core-card--wide core-blog-editor">
      <div className="core-section-head">
        <div>
          <p className="label label-accent core-meta">
            § Editor · {folioLabel}
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
            className="core-blog-editor__title-input"
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
            className="core-blog-editor__slug-input"
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
            className="core-blog-editor__excerpt-input"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="One-line summary, shown on the index page"
            maxLength={280}
            disabled={saving}
          />
        </label>

        <div className="core-field core-field--wide">
          <span className="core-field__label">Tags (optional)</span>
          <div className="core-tag-input">
            {tags.map((tag) => (
              <span key={tag} className="core-tag-chip">
                #{tag}
                <button
                  type="button"
                  aria-label={`Remove tag ${tag}`}
                  className="core-tag-chip__x"
                  onClick={() => setTags(tags.filter((t) => t !== tag))}
                  disabled={saving}
                >
                  ×
                </button>
              </span>
            ))}
            <input
              type="text"
              className="core-tag-input__field"
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  const next = normalizeTags([...tags, tagDraft]);
                  setTags(next);
                  setTagDraft("");
                }
                if (e.key === "Backspace" && tagDraft === "" && tags.length > 0) {
                  setTags(tags.slice(0, -1));
                }
              }}
              onBlur={() => {
                if (tagDraft.trim()) {
                  setTags(normalizeTags([...tags, tagDraft]));
                  setTagDraft("");
                }
              }}
              placeholder={
                tags.length === 0 ? "type, then Enter — e.g. backend, edge" : ""
              }
              disabled={saving || tags.length >= 10}
            />
          </div>
          <span className="core-field__hint">
            Up to 10 tags. Used for /blog/tag/&lt;tag&gt; pages and related-posts.
          </span>
        </div>

        <div className="core-field core-field--wide">
          <span className="core-field__label">Cover image (optional)</span>
          {coverImage ? (
            <div className="core-cover-preview">
              <img src={coverImage} alt="" />
              <button
                type="button"
                className="core-btn core-btn--ghost"
                onClick={() => setCoverImage("")}
                disabled={saving}
              >
                Remove
              </button>
            </div>
          ) : (
            <input
              type="file"
              accept="image/*"
              disabled={saving || coverUploading || isNew || !post}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file || !post) return;
                setCoverError(null);
                setCoverUploading(true);
                try {
                  const ext =
                    file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
                    "img";
                  const pathname = `blog/${post.slug}/cover-${Date.now()}.${ext}`;
                  const result = await presignAndUpload({
                    tokenUrl: "/api/admin/blog/upload-token",
                    file,
                    pathname,
                  });
                  setCoverImage(result.publicUrl);
                } catch (err) {
                  setCoverError(err instanceof Error ? err.message : String(err));
                } finally {
                  setCoverUploading(false);
                }
              }}
            />
          )}
          {coverUploading && (
            <span className="core-field__hint">Uploading…</span>
          )}
          {coverError && (
            <span className="core-field__hint core-field__hint--error">
              {coverError}
            </span>
          )}
          {isNew && (
            <span className="core-field__hint">
              Save the draft first to enable cover-image upload.
            </span>
          )}
        </div>
      </div>

      <div className="core-blog-editor__proof" aria-label="Editor status">
        <span className="core-blog-editor__proof-folio">{folioLabel}</span>
        <span className="core-blog-editor__proof-status">
          {status}
        </span>
        <span className="core-blog-editor__proof-saved">
          {proofSavedLabel}
        </span>
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

function pad(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(3, "0");
}

function arraysEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

function commitTagDraft(tags: readonly string[], draft: string): string[] {
  if (!draft.trim()) return [...tags];
  return [...tags, draft];
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
