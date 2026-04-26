import { useId } from "react";
import type { ZodTypeAny } from "zod";
import {
  defaultValueFor,
  getArrayElement,
  getArrayMinLength,
  getEnumOptions,
  getNumberChecks,
  getObjectShape,
  getStringChecks,
  getTupleItems,
  kindOf,
  unwrapModifiers,
} from "@/lib/schemaIntrospect";

type Props = {
  schema: ZodTypeAny;
  value: unknown;
  onChange: (next: unknown) => void;
  label?: string;
  path?: ReadonlyArray<string | number>;
};

type DispatchProps = {
  schema: ZodTypeAny;
  value: unknown;
  onChange: (next: unknown) => void;
  label?: string;
  path: ReadonlyArray<string | number>;
};

export function SchemaForm({ schema, value, onChange, label, path = [] }: Props) {
  const m = unwrapModifiers(schema);

  if (m.optional) {
    return (
      <OptionalWrapper
        schema={m.inner}
        value={value}
        onChange={onChange}
        label={label}
        path={path}
      />
    );
  }

  return (
    <FieldDispatch
      schema={m.inner}
      value={value}
      onChange={onChange}
      label={label}
      path={path}
    />
  );
}

function FieldDispatch({ schema, value, onChange, label, path }: DispatchProps) {
  const kind = kindOf(schema);
  switch (kind) {
    case "object":
      return (
        <ObjectFields
          schema={schema}
          value={value}
          onChange={onChange}
          label={label}
          path={path}
        />
      );
    case "array":
      return (
        <ArrayField
          schema={schema}
          value={value}
          onChange={onChange}
          label={label}
          path={path}
        />
      );
    case "tuple":
      return (
        <TupleField
          schema={schema}
          value={value}
          onChange={onChange}
          label={label}
          path={path}
        />
      );
    case "string":
      return (
        <StringInput
          schema={schema}
          value={value}
          onChange={onChange}
          label={label}
        />
      );
    case "number":
      return (
        <NumberInput
          schema={schema}
          value={value}
          onChange={onChange}
          label={label}
        />
      );
    case "boolean":
      return <BooleanInput value={value} onChange={onChange} label={label} />;
    case "enum":
      return (
        <EnumSelect
          schema={schema}
          value={value}
          onChange={onChange}
          label={label}
        />
      );
    case "literal":
      return <LiteralReadonly value={value} label={label} />;
    default:
      return (
        <UnsupportedField label={label} kind={kind} path={path} value={value} />
      );
  }
}

function ObjectFields({ schema, value, onChange, label, path }: DispatchProps) {
  const shape = getObjectShape(schema) ?? {};
  const obj =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const entries = Object.entries(shape);
  const body = (
    <div className="core-form-fieldset__body">
      {entries.map(([key, child]) => (
        <SchemaForm
          key={key}
          schema={child}
          value={obj[key]}
          label={key}
          path={[...path, key]}
          onChange={(next) => onChange({ ...obj, [key]: next })}
        />
      ))}
    </div>
  );
  if (path.length === 0) {
    return <div className="core-form">{body}</div>;
  }
  return (
    <fieldset className="core-form-fieldset">
      {label && <legend className="core-form-legend">{label}</legend>}
      {body}
    </fieldset>
  );
}

function ArrayField({ schema, value, onChange, label, path }: DispatchProps) {
  const element = getArrayElement(schema);
  const min = getArrayMinLength(schema);
  const items = Array.isArray(value) ? value : [];
  if (!element) return null;
  return (
    <fieldset className="core-form-fieldset core-form-array">
      {label && (
        <legend className="core-form-legend">
          {label} <span className="core-form-count">({items.length})</span>
        </legend>
      )}
      <div className="core-form-array__list">
        {items.map((item, i) => (
          <div key={i} className="core-form-array__item">
            <div className="core-form-array__item-head">
              <span className="core-form-array__index">[{i}]</span>
              <button
                type="button"
                className="core-btn core-btn--ghost core-btn--xs"
                onClick={() => {
                  const next = [...items];
                  next.splice(i, 1);
                  onChange(next);
                }}
                disabled={items.length <= min}
                title={items.length <= min ? `Minimum ${min} required` : undefined}
              >
                Remove
              </button>
            </div>
            <SchemaForm
              schema={element}
              value={item}
              path={[...path, i]}
              onChange={(next) => {
                const arr = [...items];
                arr[i] = next;
                onChange(arr);
              }}
            />
          </div>
        ))}
      </div>
      <div className="core-form-array__actions">
        <button
          type="button"
          className="core-btn core-btn--ghost core-btn--xs"
          onClick={() => onChange([...items, defaultValueFor(element)])}
        >
          Add item
        </button>
      </div>
    </fieldset>
  );
}

function TupleField({ schema, value, onChange, label, path }: DispatchProps) {
  const items = getTupleItems(schema);
  const arr = Array.isArray(value) ? value : [];
  return (
    <fieldset className="core-form-fieldset core-form-tuple-set">
      {label && <legend className="core-form-legend">{label}</legend>}
      <div className="core-form-tuple">
        {items.map((sub, i) => (
          <SchemaForm
            key={i}
            schema={sub}
            value={arr[i]}
            label={`[${i}]`}
            path={[...path, i]}
            onChange={(next) => {
              const out = [...arr];
              out[i] = next;
              onChange(out);
            }}
          />
        ))}
      </div>
    </fieldset>
  );
}

function StringInput({
  schema,
  value,
  onChange,
  label,
}: {
  schema: ZodTypeAny;
  value: unknown;
  onChange: (next: unknown) => void;
  label?: string;
}) {
  const id = useId();
  const checks = getStringChecks(schema);
  const str = typeof value === "string" ? value : "";
  const multiline = str.includes("\n") || str.length > 80;
  return (
    <div className="core-form-field">
      {label && (
        <label htmlFor={id} className="core-form-field__label">
          {label}
        </label>
      )}
      {multiline ? (
        <textarea
          id={id}
          className="core-form-textarea"
          value={str}
          onChange={(e) => onChange(e.target.value)}
          minLength={checks.minLength}
          maxLength={checks.maxLength}
          rows={Math.min(8, Math.max(3, str.split("\n").length))}
        />
      ) : (
        <input
          id={id}
          type="text"
          className="core-form-input"
          value={str}
          onChange={(e) => onChange(e.target.value)}
          minLength={checks.minLength}
          maxLength={checks.maxLength}
          pattern={checks.regex}
        />
      )}
    </div>
  );
}

function NumberInput({
  schema,
  value,
  onChange,
  label,
}: {
  schema: ZodTypeAny;
  value: unknown;
  onChange: (next: unknown) => void;
  label?: string;
}) {
  const id = useId();
  const checks = getNumberChecks(schema);
  const num = typeof value === "number" ? value : 0;
  return (
    <div className="core-form-field">
      {label && (
        <label htmlFor={id} className="core-form-field__label">
          {label}
        </label>
      )}
      <input
        id={id}
        type="number"
        className="core-form-input"
        value={Number.isFinite(num) ? num : ""}
        min={checks.min}
        max={checks.max}
        step={checks.int ? 1 : "any"}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "") onChange(0);
          else {
            const n = checks.int ? parseInt(v, 10) : parseFloat(v);
            onChange(Number.isFinite(n) ? n : 0);
          }
        }}
      />
    </div>
  );
}

function BooleanInput({
  value,
  onChange,
  label,
}: {
  value: unknown;
  onChange: (next: unknown) => void;
  label?: string;
}) {
  const id = useId();
  const checked = value === true;
  return (
    <div className="core-form-field core-form-field--inline">
      <input
        id={id}
        type="checkbox"
        className="core-form-checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label && (
        <label htmlFor={id} className="core-form-field__label">
          {label}
        </label>
      )}
    </div>
  );
}

function EnumSelect({
  schema,
  value,
  onChange,
  label,
}: {
  schema: ZodTypeAny;
  value: unknown;
  onChange: (next: unknown) => void;
  label?: string;
}) {
  const id = useId();
  const options = getEnumOptions(schema);
  const str = typeof value === "string" ? value : options[0] ?? "";
  return (
    <div className="core-form-field">
      {label && (
        <label htmlFor={id} className="core-form-field__label">
          {label}
        </label>
      )}
      <select
        id={id}
        className="core-form-select"
        value={str}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function LiteralReadonly({ value, label }: { value: unknown; label?: string }) {
  return (
    <div className="core-form-field">
      {label && <span className="core-form-field__label">{label}</span>}
      <code className="core-form-literal">{String(value)}</code>
    </div>
  );
}

function OptionalWrapper({
  schema,
  value,
  onChange,
  label,
  path,
}: DispatchProps) {
  const isSet = value !== undefined;
  return (
    <div className="core-form-field core-form-optional">
      <div className="core-form-optional__head">
        <label className="core-form-field__label core-form-field__label--inline">
          <input
            type="checkbox"
            className="core-form-checkbox"
            checked={isSet}
            onChange={(e) => {
              if (e.target.checked) onChange(defaultValueFor(schema));
              else onChange(undefined);
            }}
          />
          <span>{label ?? "value"}</span>
          {!isSet && <span className="core-form-optional__hint">unset</span>}
        </label>
      </div>
      {isSet && (
        <div className="core-form-optional__body">
          <SchemaForm
            schema={schema}
            value={value}
            onChange={onChange}
            path={path}
          />
        </div>
      )}
    </div>
  );
}

function UnsupportedField({
  label,
  kind,
  path,
  value,
}: {
  label?: string;
  kind: string;
  path: ReadonlyArray<string | number>;
  value: unknown;
}) {
  return (
    <div className="core-form-field">
      {label && <span className="core-form-field__label">{label}</span>}
      <p className="core-error">
        Unsupported schema kind <code>{kind}</code> at{" "}
        <code>{path.join(".") || "(root)"}</code>. Edit in JSON mode.
      </p>
      <pre className="core-form-literal core-form-literal--block">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
