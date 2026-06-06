import { useRef, useState } from "react";
import { presignAndUpload } from "@/lib/uploads";

const CV_PATH = "cv/current.pdf";
const MAX_BYTES = 10 * 1024 * 1024;

type Status =
  | { kind: "idle" }
  | { kind: "uploading"; percent: number }
  | { kind: "done"; url: string; at: number }
  | { kind: "error"; message: string };

export function CVUploader() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [dragging, setDragging] = useState(false);

  const accept = (picked: File | null | undefined) => {
    setStatus({ kind: "idle" });
    if (!picked) {
      setFile(null);
      return;
    }
    if (picked.type !== "application/pdf") {
      setFile(null);
      setStatus({ kind: "error", message: "Pick a PDF file." });
      return;
    }
    if (picked.size > MAX_BYTES) {
      setFile(null);
      setStatus({
        kind: "error",
        message: `File is ${(picked.size / 1024 / 1024).toFixed(1)}MB — max is ${MAX_BYTES / 1024 / 1024}MB.`,
      });
      return;
    }
    setFile(picked);
  };

  const onPick = (event: React.ChangeEvent<HTMLInputElement>) => {
    accept(event.target.files?.[0] ?? null);
  };

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (uploading) return;
    accept(event.dataTransfer.files?.[0] ?? null);
  };

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (uploading) return;
    setDragging(true);
  };

  const onDragLeave = () => setDragging(false);

  const launch = () => {
    if (uploading) return;
    inputRef.current?.click();
  };

  const onZoneKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      launch();
    }
  };

  const send = async () => {
    if (!file) return;
    setStatus({ kind: "uploading", percent: 0 });
    try {
      const result = await presignAndUpload({
        tokenUrl: "/api/admin/cv/upload-token",
        file,
        contentType: "application/pdf",
        onProgress: (percent) => {
          setStatus({ kind: "uploading", percent });
        },
      });
      setStatus({ kind: "done", url: result.publicUrl, at: Date.now() });
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus({ kind: "error", message });
    }
  };

  const uploading = status.kind === "uploading";

  const zoneClass = [
    "core-dropzone",
    dragging ? "core-dropzone--active" : "",
    file ? "core-dropzone--filled" : "",
    uploading ? "core-dropzone--disabled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className="core-card" aria-labelledby="core-cv-heading">
      <p className="label label-accent core-meta">§ CV</p>
      <h2 id="core-cv-heading" className="core-heading core-heading--sm">
        Replace CV.
      </h2>
      <p className="core-body">
        Uploads to <code>{CV_PATH}</code>. <code>/api/cv</code> redirects to
        the latest version (CDN refresh ~60s).
      </p>

      <div className="core-field">
        <span className="core-field__label">PDF file</span>
        <div
          className={zoneClass}
          role="button"
          tabIndex={0}
          aria-disabled={uploading}
          onClick={launch}
          onKeyDown={onZoneKeyDown}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          {file ? (
            <>
              <span className="core-dropzone__name">{file.name}</span>
              <span className="core-dropzone__hint">
                {(file.size / 1024 / 1024).toFixed(2)} MB · click or drop to replace
              </span>
            </>
          ) : (
            <>
              <span className="core-dropzone__name">
                {dragging ? "Drop the PDF" : "Drop a PDF here"}
              </span>
              <span className="core-dropzone__hint">
                or click to browse · max {MAX_BYTES / 1024 / 1024}MB
              </span>
            </>
          )}
        </div>
        <input
          title="CV PDF file input"
          ref={inputRef}
          type="file"
          accept="application/pdf"
          onChange={onPick}
          disabled={uploading}
          className="core-file core-file--hidden"
          tabIndex={-1}
        />
      </div>

      <div className="core-actions">
        <a
          className="core-btn core-btn--ghost"
          href="/api/cv"
          target="_blank"
          rel="noreferrer"
        >
          View current
        </a>
        <button
          type="button"
          className="core-btn"
          onClick={send}
          disabled={!file || uploading}
        >
          {uploading ? `Uploading ${status.percent.toFixed(0)}%` : "Upload"}
        </button>
      </div>

      {status.kind === "done" && (
        <p className="core-status">
          Uploaded.{" "}
          <a href={status.url} target="_blank" rel="noreferrer">
            View blob
          </a>
        </p>
      )}
      {status.kind === "error" && (
        <p role="alert" className="core-error">
          {status.message}
        </p>
      )}
    </section>
  );
}
