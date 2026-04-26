import { useEffect, useMemo, useRef, useState } from "react";
import { presignAndUpload } from "@/lib/uploads";
import { Editor as TinyMCE } from "@tinymce/tinymce-react";
import type { Editor as TinyMCEEditor } from "tinymce";

// Self-hosted TinyMCE — these side-effect imports register the engine,
// theme, model, plugins, icons, and skin onto window.tinymce so the
// Editor component below uses the bundled copy instead of the CDN.
import "tinymce/tinymce";
import "tinymce/models/dom/model";
import "tinymce/themes/silver";
import "tinymce/icons/default";
import "tinymce/skins/ui/oxide/skin.js";
import "tinymce/skins/content/default/content.js";
import "tinymce/plugins/autolink";
import "tinymce/plugins/autoresize";
import "tinymce/plugins/code";
import "tinymce/plugins/codesample";
import "tinymce/plugins/fullscreen";
import "tinymce/plugins/image";
import "tinymce/plugins/link";
import "tinymce/plugins/lists";
import "tinymce/plugins/quickbars";
import "tinymce/plugins/searchreplace";
import "tinymce/plugins/table";
import "tinymce/plugins/wordcount";

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
  // null → new post; string → editing existing slug
  initialSlug: string | null;
  onClose: () => void;
  onCreated: (slug: string) => void;
};

export function BlogEditor({ initialSlug, onClose, onCreated }: Props) {
  const isNew = initialSlug === null;
  const editorRef = useRef<TinyMCEEditor | null>(null);

  const [post, setPost] = useState<BlogPost | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [originalSnapshot, setOriginalSnapshot] = useState<string>(
    snapshot("", "", ""),
  );

  const [load, setLoad] = useState<LoadStatus>(
    isNew ? { kind: "ready" } : { kind: "loading" },
  );
  const [save, setSave] = useState<SaveStatus>({ kind: "idle" });

  // Latest slug ref so the TinyMCE upload handler (captured once at init)
  // always uploads under the current slug, not the slug at first render.
  const slugRef = useRef<string>(slug);
  useEffect(() => {
    slugRef.current = slug || "draft";
  }, [slug]);

  // Load existing post
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
        setSlug(data.slug);
        setExcerpt(data.excerpt ?? "");
        setContent(data.content);
        setOriginalSnapshot(
          snapshot(data.title, data.excerpt ?? "", data.content),
        );
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

  // Auto-derive slug from title while creating, until user types in slug field
  useEffect(() => {
    if (!isNew || slugTouched) return;
    setSlug(slugify(title));
  }, [title, isNew, slugTouched]);

  const dirty = useMemo(() => {
    if (isNew) return title.length > 0 || content.length > 0;
    return snapshot(title, excerpt, content) !== originalSnapshot;
  }, [title, excerpt, content, originalSnapshot, isNew]);

  // Warn before navigating away with unsaved edits
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const tinymceInit = useMemo(
    () => ({
      licenseKey: "gpl",
      height: 600,
      menubar: false,
      branding: false,
      promotion: false,
      statusbar: true,
      plugins: [
        "autolink",
        "autoresize",
        "code",
        "codesample",
        "fullscreen",
        "image",
        "link",
        "lists",
        "quickbars",
        "searchreplace",
        "table",
        "wordcount",
      ],
      toolbar:
        "undo redo | blocks | bold italic underline | link image table | bullist numlist blockquote | codesample code | removeformat | searchreplace fullscreen",
      block_formats:
        "Paragraph=p; Heading 2=h2; Heading 3=h3; Heading 4=h4; Quote=blockquote; Code=pre",
      quickbars_selection_toolbar:
        "bold italic | quicklink h2 h3 blockquote",
      quickbars_insert_toolbar: "image table",
      contextmenu: "link image table",
      image_caption: true,
      image_advtab: false,
      image_title: false,
      image_description: true,
      automatic_uploads: true,
      paste_data_images: true,
      images_file_types: "jpeg,jpg,png,webp,gif,svg",
      file_picker_types: "image",
      relative_urls: false,
      remove_script_host: false,
      convert_urls: false,
      browser_spellcheck: true,
      content_style: CONTENT_STYLE,
      images_upload_handler: async (
        blobInfo: { blob: () => Blob; filename: () => string },
        progress: (percent: number) => void,
      ) => {
        const file = blobInfo.blob();
        const safeName = uniqueImageName(
          blobInfo.filename() || "image",
          file.type,
        );
        const result = await presignAndUpload({
          tokenUrl: "/api/admin/blog/upload-token",
          pathname: `blog/images/${slugRef.current}/${safeName}`,
          file,
          contentType: file.type || undefined,
          onProgress: progress,
        });
        return result.publicUrl;
      },
    }),
    [],
  );

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
      const created = await adminBlogApi.create({
        slug: slugCheck.data,
        title: title.trim(),
        excerpt: excerpt.trim() || undefined,
        content,
      });
      setPost(created);
      setOriginalSnapshot(
        snapshot(created.title, created.excerpt ?? "", created.content),
      );
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
      const updated = await adminBlogApi.update(post.slug, {
        title: title.trim(),
        excerpt: excerpt.trim(),
        content,
        ...(patch?.status ? { status: patch.status } : {}),
      });
      setPost(updated);
      setTitle(updated.title);
      setExcerpt(updated.excerpt ?? "");
      setContent(updated.content);
      // Push updated content back into the editor so it stays in sync after
      // server-side normalization (e.g. status change without text edits).
      if (editorRef.current) editorRef.current.setContent(updated.content);
      setOriginalSnapshot(
        snapshot(updated.title, updated.excerpt ?? "", updated.content),
      );
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

      <div className="core-blog-canvas">
        <TinyMCE
          licenseKey="gpl"
          onInit={(_evt, editor) => {
            editorRef.current = editor;
          }}
          value={content}
          onEditorChange={(next) => setContent(next)}
          init={tinymceInit}
          disabled={saving}
        />
      </div>

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

// Editor-area styles. TinyMCE renders into an iframe so it doesn't inherit
// the host page CSS — keep this loosely matched to .blog-prose so the
// admin's draft preview reads similarly to what publishes.
const CONTENT_STYLE = `
  body {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 14px;
    line-height: 1.75;
    color: #1a1a1a;
    margin: 24px;
    max-width: 64ch;
  }
  h1, h2, h3, h4 {
    font-family: Georgia, "Times New Roman", serif;
    line-height: 1.2;
    margin: 36px 0 12px;
  }
  h2 { font-size: 28px; }
  h3 { font-size: 22px; }
  h4 { font-size: 18px; }
  p { margin: 0 0 18px; }
  a { color: #c44a36; text-underline-offset: 3px; }
  blockquote {
    border-left: 3px solid #c44a36;
    margin: 18px 0;
    padding: 6px 0 6px 18px;
    font-style: italic;
    color: #555;
  }
  code {
    font-family: ui-monospace, monospace;
    background: #f3f3f3;
    padding: 1px 6px;
    border-radius: 3px;
    border: 1px solid #e2e2e2;
  }
  pre {
    background: #f3f3f3;
    border: 1px solid #e2e2e2;
    padding: 18px;
    overflow-x: auto;
  }
  pre code { background: none; border: none; padding: 0; }
  img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 24px 0;
    border: 1px solid #e2e2e2;
  }
  figure { margin: 24px 0; }
  figure img { margin: 0; }
  figcaption {
    font-size: 12px;
    color: #666;
    margin-top: 6px;
    text-align: center;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  th, td { border: 1px solid #e2e2e2; padding: 9px 12px; text-align: left; }
  th { background: #f3f3f3; font-weight: 600; }
`;

function snapshot(title: string, excerpt: string, content: string): string {
  return `${title}\u0000${excerpt}\u0000${content}`;
}

// Build a unique blob filename. We dropped server-side `addRandomSuffix`
// because it produced 400s for filenames containing dots in the basename
// (e.g. "Screenshot-2026-04-17-at-20.56.40.png"). Instead: collapse all
// dots in the basename into hyphens, prefix with epoch ms for uniqueness,
// and infer the extension from the MIME type when missing.
function uniqueImageName(filename: string, mime: string): string {
  const dot = filename.lastIndexOf(".");
  const rawBase = dot > 0 ? filename.slice(0, dot) : filename;
  const rawExt = dot > 0 ? filename.slice(dot + 1) : extFromMime(mime);
  const base = rawBase.replace(/[^a-zA-Z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  const ext = (rawExt || "bin").replace(/[^a-zA-Z0-9]+/g, "").toLowerCase();
  const stem = base || "image";
  return `${Date.now()}-${stem}.${ext}`;
}

function extFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  if (mime === "image/svg+xml") return "svg";
  return "bin";
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
