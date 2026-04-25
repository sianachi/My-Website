import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";

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

  const onPick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0] ?? null;
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

  const send = async () => {
    if (!file) return;
    setStatus({ kind: "uploading", percent: 0 });
    try {
      const result = await upload(CV_PATH, file, {
        access: "public",
        handleUploadUrl: "/api/admin/cv/upload-token",
        contentType: "application/pdf",
        onUploadProgress: ({ percentage }) => {
          setStatus({ kind: "uploading", percent: percentage });
        },
      });
      setStatus({ kind: "done", url: result.url, at: Date.now() });
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus({ kind: "error", message });
    }
  };

  const uploading = status.kind === "uploading";

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

      <label className="core-field">
        <span className="core-field__label">PDF file</span>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          onChange={onPick}
          disabled={uploading}
          className="core-file"
        />
      </label>

      <div className="core-actions">
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
