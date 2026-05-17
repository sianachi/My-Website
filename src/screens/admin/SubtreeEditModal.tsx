import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { ZodTypeAny } from "zod";
import { SchemaForm } from "./SchemaForm";

type Props = {
  schema: ZodTypeAny;
  value: unknown;
  pathLabel: string;
  onSave: (next: unknown) => void;
  onCancel: () => void;
};

export function SubtreeEditModal({
  schema,
  value,
  pathLabel,
  onSave,
  onCancel,
}: Props) {
  const [draft, setDraft] = useState<unknown>(value);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const submit = () => {
    const parsed = schema.safeParse(draft);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      const path = first?.path.join(".") || "(root)";
      setError(`${path}: ${first?.message ?? "invalid"}`);
      return;
    }
    onSave(parsed.data);
  };

  return createPortal(
    <div
      className="core-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="core-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="core-modal">
        <div className="core-modal__head">
          <div>
            <h2 id="core-modal-title" className="core-modal__title">
              Edit subtree
            </h2>
            <p className="core-modal__path">{pathLabel || "(root)"}</p>
          </div>
          <button
            type="button"
            className="core-btn core-btn--ghost core-btn--xs"
            onClick={onCancel}
            aria-label="Close"
          >
            Close
          </button>
        </div>
        <div className="core-modal__body">
          <SchemaForm
            schema={schema}
            value={draft}
            onChange={(next) => {
              setDraft(next);
              if (error) setError(null);
            }}
          />
          {error && (
            <p role="alert" className="core-error" style={{ marginTop: 12 }}>
              {error}
            </p>
          )}
        </div>
        <div className="core-modal__foot">
          <button
            type="button"
            className="core-btn core-btn--ghost"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button type="button" className="core-btn" onClick={submit}>
            Apply
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
