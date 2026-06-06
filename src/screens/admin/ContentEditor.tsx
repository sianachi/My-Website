import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import type { ZodTypeAny } from "zod";
import { Segment } from "@/components/Segment";
import { makeJsonExtensions } from "./jsonEditor";
import { SchemaForm } from "./SchemaForm";
import { SubtreeEditModal } from "./SubtreeEditModal";
import {
  formatJsonPath,
  replaceJsonRange,
  type JsonSelection,
} from "./jsonPath";
import { getSubSchema, getSubValue } from "@/lib/schemaIntrospect";
import { tryParseJson } from "@/lib/parseJson";
import {
  AboutContentSchema,
  ContactContentSchema,
  CoverContentSchema,
  WorkContentSchema,
} from "@/shared/data/schemas";
import {
  adminApi,
  ContentSaveError,
  type ContentDocId,
  type ZodIssueLite,
} from "@/lib/adminApi";

const DOCS: ReadonlyArray<{ id: ContentDocId; label: string }> = [
  { id: "cover", label: "Cover" },
  { id: "about", label: "About" },
  { id: "work", label: "Work" },
  { id: "contact", label: "Contact" },
];

const SCHEMAS: Record<ContentDocId, ZodTypeAny> = {
  cover: CoverContentSchema,
  about: AboutContentSchema,
  work: WorkContentSchema,
  contact: ContactContentSchema,
};

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "loadError"; message: string }
  | { kind: "ready" }
  | { kind: "saving" }
  | { kind: "saved"; at: string }
  | { kind: "saveError"; message: string; issues: ZodIssueLite[] };

type SubtreeEdit = {
  selection: JsonSelection;
  schema: ZodTypeAny;
  value: unknown;
};

type Mode = "json" | "form";

export function ContentEditor() {
  const [active, setActive] = useState<ContentDocId>("cover");
  const [mode, setMode] = useState<Mode>("json");
  const [text, setText] = useState("");
  const [original, setOriginal] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [subtreeEdit, setSubtreeEdit] = useState<SubtreeEdit | null>(null);
  const [modeSwitchError, setModeSwitchError] = useState<string | null>(null);
  const cache = useRef<Partial<Record<ContentDocId, string>>>({});
  const textRef = useRef(text);
  const activeRef = useRef(active);
  useEffect(() => {
    textRef.current = text;
  }, [text]);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const load = useCallback(async (docId: ContentDocId) => {
    const cached = cache.current[docId];
    if (cached !== undefined) {
      setText(cached);
      setOriginal(cached);
      setStatus({ kind: "ready" });
      return;
    }
    setStatus({ kind: "loading" });
    try {
      const data = await adminApi.getContent(docId);
      const formatted = JSON.stringify(data, null, 2);
      cache.current[docId] = formatted;
      setText(formatted);
      setOriginal(formatted);
      setStatus({ kind: "ready" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus({ kind: "loadError", message });
    }
  }, []);

  useEffect(() => {
    void load(active);
  }, [active, load]);

  const dirty = text !== original;

  const switchTo = (next: ContentDocId) => {
    if (next === active) return;
    if (
      dirty &&
      !window.confirm("Discard unsaved changes to this document?")
    ) {
      return;
    }
    setActive(next);
  };

  const save = async () => {
    const parse = tryParseJson(text);
    if (!parse.ok) {
      setStatus({
        kind: "saveError",
        message: `Invalid JSON: ${parse.error}`,
        issues: [],
      });
      return;
    }
    const local = SCHEMAS[active].safeParse(parse.data);
    if (!local.success) {
      setStatus({
        kind: "saveError",
        message: `Validation failed (${local.error.issues.length} issue${local.error.issues.length === 1 ? "" : "s"})`,
        issues: local.error.issues.map((i) => ({
          path: [...i.path],
          message: i.message,
        })),
      });
      return;
    }
    setStatus({ kind: "saving" });
    try {
      await adminApi.saveContent(active, local.data);
      setOriginal(text);
      cache.current[active] = text;
      setStatus({ kind: "saved", at: formatTime(new Date()) });
    } catch (err) {
      if (err instanceof ContentSaveError) {
        setStatus({
          kind: "saveError",
          message: err.message,
          issues: err.issues,
        });
      } else {
        const message = err instanceof Error ? err.message : String(err);
        setStatus({ kind: "saveError", message, issues: [] });
      }
    }
  };

  const reset = () => {
    setText(original);
    setStatus({ kind: "ready" });
  };

  const resetToDefault = async () => {
    const confirmed = window.confirm(
      `Reset ${active} to the default content shipped with the site? This overwrites the current saved content.`,
    );
    if (!confirmed) return;
    setStatus({ kind: "saving" });
    try {
      const result = await adminApi.resetContent(active);
      const formatted = JSON.stringify(result.data, null, 2);
      cache.current[active] = formatted;
      setText(formatted);
      setOriginal(formatted);
      setStatus({ kind: "saved", at: formatTime(new Date()) });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus({ kind: "saveError", message, issues: [] });
    }
  };

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    if (next === "form") {
      const parse = tryParseJson(text);
      if (!parse.ok) {
        setModeSwitchError(
          `JSON is invalid — fix it before switching: ${parse.error}`,
        );
        return;
      }
    }
    setModeSwitchError(null);
    setMode(next);
  };

  const onFormChange = (next: unknown) => {
    setText(JSON.stringify(next, null, 2));
    if (status.kind === "saved" || status.kind === "saveError") {
      setStatus({ kind: "ready" });
    }
  };

  const onSelectionEdit = useCallback((info: JsonSelection) => {
    const parse = tryParseJson(textRef.current);
    if (!parse.ok) return;
    const schema = getSubSchema(SCHEMAS[activeRef.current], info.path);
    if (!schema) return;
    const sub = getSubValue(parse.data, info.path);
    setSubtreeEdit({ selection: info, schema, value: sub });
  }, []);

  const cmExtensions = useMemo(
    () => makeJsonExtensions({ onSelectionEdit }),
    [onSelectionEdit],
  );

  const applySubtreeEdit = (next: unknown) => {
    if (!subtreeEdit) return;
    const newText = replaceJsonRange(
      text,
      subtreeEdit.selection.from,
      subtreeEdit.selection.to,
      next,
    );
    setText(newText);
    setSubtreeEdit(null);
    if (status.kind === "saved" || status.kind === "saveError") {
      setStatus({ kind: "ready" });
    }
  };

  const busy = status.kind === "loading" || status.kind === "saving";

  const formData =
    mode === "form" ? tryParseJson(text) : { ok: true as const, data: null };

  return (
    <section
      className="core-card core-card--wide"
      aria-labelledby="core-content-heading"
    >
      <div className="core-section-head">
        <div>
          <p className="label label-accent core-meta">§ Content</p>
          <h2
            id="core-content-heading"
            className="core-heading core-heading--sm"
          >
            Edit content.
          </h2>
        </div>
        <div className="core-toolbar">
          <Segment
            value={mode}
            options={["json", "form"]}
            onChange={switchMode}
            ariaLabel="Editor mode"
            renderLabel={(v) => (v === "json" ? "JSON" : "Form")}
          />
        </div>
      </div>
      <p className="core-body">
        Each document is validated against its schema before saving. CDN cache
        on the public endpoints holds for up to an hour.
      </p>

      {modeSwitchError && (
        <p role="alert" className="core-error">
          {modeSwitchError}
        </p>
      )}

      <div className="core-tabs" role="tablist" aria-label="Content document">
        {DOCS.map((doc) => (
          <button
            key={doc.id}
            type="button"
            role="tab"
            aria-selected={active === doc.id}
            className={
              "core-tab" + (active === doc.id ? " core-tab--active" : "")
            }
            onClick={() => switchTo(doc.id)}
            disabled={busy}
          >
            {doc.label}
            {dirty && active === doc.id ? " •" : ""}
          </button>
        ))}
      </div>

      {status.kind === "loading" && (
        <p className="core-body">Loading {active}…</p>
      )}
      {status.kind === "loadError" && (
        <p role="alert" className="core-error">
          Failed to load: {status.message}
        </p>
      )}

      {status.kind !== "loading" && status.kind !== "loadError" && (
        <>
          {mode === "json" && (
            <div
              className="core-editor"
              aria-label={`${active} JSON`}
              data-disabled={status.kind === "saving" ? "true" : undefined}
            >
              <CodeMirror
                value={text}
                theme="none"
                extensions={cmExtensions}
                editable={status.kind !== "saving"}
                basicSetup={{
                  lineNumbers: true,
                  foldGutter: true,
                  bracketMatching: true,
                  closeBrackets: true,
                  highlightActiveLine: false,
                  highlightActiveLineGutter: false,
                  autocompletion: false,
                  searchKeymap: true,
                  tabSize: 2,
                }}
                onChange={(value) => {
                  setText(value);
                  if (status.kind === "saved" || status.kind === "saveError") {
                    setStatus({ kind: "ready" });
                  }
                }}
              />
            </div>
          )}

          {mode === "form" && formData.ok && (
            <SchemaForm
              schema={SCHEMAS[active]}
              value={formData.data}
              onChange={onFormChange}
            />
          )}

          {mode === "form" && !formData.ok && (
            <p role="alert" className="core-error">
              JSON parse failed: {formData.error}. Switch to JSON mode to fix.
            </p>
          )}

          <div className="core-actions">
            <button
              type="button"
              className="core-btn"
              onClick={save}
              disabled={!dirty || status.kind === "saving"}
            >
              {status.kind === "saving" ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              className="core-btn core-btn--ghost"
              onClick={reset}
              disabled={!dirty || status.kind === "saving"}
            >
              Discard
            </button>
            <button
              type="button"
              className="core-btn core-btn--ghost"
              onClick={resetToDefault}
              disabled={status.kind === "saving"}
              title="Overwrite the current saved content with the default JSON shipped with the site"
            >
              Reset to default
            </button>
          </div>

          {status.kind === "saved" && (
            <p className="core-status">Saved at {status.at}.</p>
          )}
          {status.kind === "saveError" && (
            <div role="alert" className="core-error-block">
              <p className="core-error">{status.message}</p>
              {status.issues.length > 0 && (
                <ul className="core-issue-list">
                  {status.issues.slice(0, 5).map((issue, i) => (
                    <li key={i}>
                      <code>{issue.path.join(".") || "(root)"}</code>:{" "}
                      {issue.message}
                    </li>
                  ))}
                  {status.issues.length > 5 && (
                    <li>…{status.issues.length - 5} more</li>
                  )}
                </ul>
              )}
            </div>
          )}
        </>
      )}

      {subtreeEdit && (
        <SubtreeEditModal
          schema={subtreeEdit.schema}
          value={subtreeEdit.value}
          pathLabel={formatJsonPath(subtreeEdit.selection.path)}
          onSave={applySubtreeEdit}
          onCancel={() => setSubtreeEdit(null)}
        />
      )}
    </section>
  );
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour12: false });
}
