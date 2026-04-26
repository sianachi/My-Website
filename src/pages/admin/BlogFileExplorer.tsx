import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { adminBlogApi, BlogApiError, type BlogFile } from "@/lib/blogApi";
import { presignAndUpload } from "@/lib/uploads";

type LoadStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "error"; message: string };

export type BlogFileExplorerHandle = {
  refresh: () => void;
};

type Props = {
  /** Persisted slug. Pass null for unsaved new posts to disable the panel. */
  slug: string | null;
  /** Insert an image node at the editor caret. */
  onInsertImage: (url: string, alt: string) => void;
  /** Insert linked text at the editor caret. */
  onInsertLink: (url: string, label: string) => void;
};

export const BlogFileExplorer = forwardRef<BlogFileExplorerHandle, Props>(
  function BlogFileExplorer({ slug, onInsertImage, onInsertLink }, ref) {
  const [files, setFiles] = useState<BlogFile[]>([]);
  const [load, setLoad] = useState<LoadStatus>({ kind: "idle" });
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(async () => {
    if (!slug) return;
    setLoad({ kind: "loading" });
    try {
      const data = await adminBlogApi.listFiles(slug);
      setFiles(data.files);
      setLoad({ kind: "ready" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setLoad({ kind: "error", message });
    }
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    void refresh();
  }, [slug, refresh]);

  const uploadOne = useCallback(
    async (file: File) => {
      if (!slug) return;
      const filename = uniqueAssetName(file.name || "file", file.type);
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setUploads((prev) => [
        ...prev,
        { id, filename, progress: 0, status: "uploading" },
      ]);
      try {
        await presignAndUpload({
          tokenUrl: "/api/admin/blog/upload-token",
          pathname: `blog/${slug}/${filename}`,
          file,
          contentType: file.type || "application/octet-stream",
          onProgress: (p) =>
            setUploads((prev) =>
              prev.map((u) => (u.id === id ? { ...u, progress: p } : u)),
            ),
        });
        setUploads((prev) =>
          prev.map((u) =>
            u.id === id ? { ...u, progress: 1, status: "done" } : u,
          ),
        );
        await refresh();
        // Drop the row after a short pause so users see the green "done" tick.
        window.setTimeout(() => {
          setUploads((prev) => prev.filter((u) => u.id !== id));
        }, 1200);
      } catch (err) {
        const message =
          err instanceof BlogApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : String(err);
        setUploads((prev) =>
          prev.map((u) =>
            u.id === id ? { ...u, status: "error", error: message } : u,
          ),
        );
      }
    },
    [slug, refresh],
  );

  const uploadMany = useCallback(
    (list: FileList | File[]) => {
      const arr = Array.from(list);
      for (const f of arr) {
        void uploadOne(f);
      }
    },
    [uploadOne],
  );

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    uploadMany(e.target.files);
    e.target.value = "";
  };

  const onDragOver = (e: React.DragEvent) => {
    if (!slug) return;
    e.preventDefault();
    setDragActive(true);
  };
  const onDragLeave = () => setDragActive(false);
  const onDrop = (e: React.DragEvent) => {
    if (!slug) return;
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) uploadMany(e.dataTransfer.files);
  };

  const onDelete = async (file: BlogFile) => {
    if (!slug) return;
    if (!window.confirm(`Delete ${file.filename}?`)) return;
    try {
      await adminBlogApi.deleteFile(slug, file.filename);
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      window.alert(`Delete failed: ${message}`);
    }
  };

  const onInsert = (file: BlogFile) => {
    const stem = file.filename.replace(/\.[^.]+$/, "") || file.filename;
    if (isImage(file.filename)) {
      onInsertImage(file.url, stem);
    } else {
      onInsertLink(file.url, stem);
    }
  };

  useImperativeHandle(ref, () => ({ refresh: () => void refresh() }), [
    refresh,
  ]);

  const onCopy = async (file: BlogFile) => {
    try {
      await navigator.clipboard.writeText(file.url);
      setCopied(file.filename);
      window.setTimeout(() => setCopied(null), 1200);
    } catch {
      window.prompt("Copy URL:", file.url);
    }
  };

  const totalBytes = useMemo(
    () => files.reduce((sum, f) => sum + f.size, 0),
    [files],
  );

  if (!slug) {
    return (
      <aside className="core-files core-files--disabled">
        <div className="core-files__head">
          <p className="label label-accent">§ Files</p>
        </div>
        <p className="core-field__hint">
          Save the draft once to start managing files for this post.
        </p>
      </aside>
    );
  }

  return (
    <aside
      className={`core-files${dragActive ? " core-files--drag" : ""}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="core-files__head">
        <div>
          <p className="label label-accent">§ Files</p>
          <p className="core-field__hint">
            blog/{slug}/ · {files.length} file{files.length === 1 ? "" : "s"} ·{" "}
            {formatBytes(totalBytes)}
          </p>
        </div>
        <div className="core-files__actions">
          <button
            type="button"
            className="core-btn core-btn--ghost"
            onClick={() => inputRef.current?.click()}
          >
            Upload…
          </button>
          <button
            type="button"
            className="core-btn core-btn--ghost"
            onClick={() => void refresh()}
            disabled={load.kind === "loading"}
            title="Refresh"
          >
            ↻
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={onPickFiles}
        />
      </div>

      {load.kind === "error" && (
        <p role="alert" className="core-error">
          {load.message}
        </p>
      )}

      {uploads.length > 0 && (
        <ul className="core-files__uploads">
          {uploads.map((u) => (
            <li key={u.id} className={`core-files__upload core-files__upload--${u.status}`}>
              <span className="core-files__upload-name">{u.filename}</span>
              {u.status === "uploading" && (
                <span className="core-files__upload-progress">
                  {Math.round(u.progress * 100)}%
                </span>
              )}
              {u.status === "done" && (
                <span className="core-files__upload-progress">✓</span>
              )}
              {u.status === "error" && (
                <span className="core-files__upload-error" title={u.error}>
                  failed
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {load.kind === "ready" && files.length === 0 && (
        <p className="core-field__hint">
          Drop files here, or click <em>Upload…</em>.
        </p>
      )}

      {files.length > 0 && (
        <ul className="core-files__list">
          {files.map((f) => (
            <li key={f.key} className="core-files__row">
              <button
                type="button"
                className="core-files__name"
                onClick={() => onInsert(f)}
                title="Insert as markdown at caret"
              >
                {isImage(f.filename) ? (
                  <img
                    src={f.url}
                    alt=""
                    className="core-files__thumb"
                    loading="lazy"
                  />
                ) : (
                  <span className="core-files__icon">⎙</span>
                )}
                <span className="core-files__filename">{f.filename}</span>
              </button>
              <span className="core-files__meta">{formatBytes(f.size)}</span>
              <div className="core-files__row-actions">
                <button
                  type="button"
                  className="core-btn core-btn--ghost core-btn--xs"
                  onClick={() => void onCopy(f)}
                >
                  {copied === f.filename ? "Copied" : "Copy URL"}
                </button>
                <button
                  type="button"
                  className="core-btn core-btn--ghost core-btn--xs"
                  onClick={() => void onDelete(f)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
  },
);

type UploadState = {
  id: string;
  filename: string;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
};

const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "webp", "gif", "svg", "avif"]);

function isImage(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_EXTS.has(ext);
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function uniqueAssetName(filename: string, mime: string): string {
  const dot = filename.lastIndexOf(".");
  const rawBase = dot > 0 ? filename.slice(0, dot) : filename;
  const rawExt = dot > 0 ? filename.slice(dot + 1) : extFromMime(mime);
  const base = rawBase.replace(/[^a-zA-Z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  const ext = (rawExt || "bin").replace(/[^a-zA-Z0-9]+/g, "").toLowerCase();
  const stem = base || "file";
  return `${Date.now()}-${stem}.${ext}`;
}

function extFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  if (mime === "image/svg+xml") return "svg";
  if (mime === "application/pdf") return "pdf";
  if (mime === "text/plain") return "txt";
  if (mime === "text/markdown") return "md";
  if (mime === "application/zip") return "zip";
  return "bin";
}
