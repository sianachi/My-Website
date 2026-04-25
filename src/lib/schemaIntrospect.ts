import { z, type ZodTypeAny } from "zod";

export type SchemaKind =
  | "object"
  | "array"
  | "tuple"
  | "string"
  | "number"
  | "boolean"
  | "enum"
  | "literal"
  | "unknown";

export type Modifiers = {
  inner: ZodTypeAny;
  optional: boolean;
  nullable: boolean;
  hasDefault: boolean;
  defaultValue?: unknown;
};

export function unwrapModifiers(schema: ZodTypeAny): Modifiers {
  let cur: ZodTypeAny = schema;
  let optional = false;
  let nullable = false;
  let hasDefault = false;
  let defaultValue: unknown;
  while (true) {
    const def = cur._def as { typeName?: string; innerType?: ZodTypeAny; defaultValue?: () => unknown };
    if (def.typeName === "ZodOptional" && def.innerType) {
      optional = true;
      cur = def.innerType;
    } else if (def.typeName === "ZodNullable" && def.innerType) {
      nullable = true;
      cur = def.innerType;
    } else if (def.typeName === "ZodDefault" && def.innerType) {
      hasDefault = true;
      try {
        defaultValue = def.defaultValue?.();
      } catch {
        defaultValue = undefined;
      }
      cur = def.innerType;
    } else {
      break;
    }
  }
  return { inner: cur, optional, nullable, hasDefault, defaultValue };
}

export function kindOf(schema: ZodTypeAny): SchemaKind {
  const def = schema._def as { typeName?: string };
  switch (def.typeName) {
    case "ZodObject":
      return "object";
    case "ZodArray":
      return "array";
    case "ZodTuple":
      return "tuple";
    case "ZodString":
      return "string";
    case "ZodNumber":
      return "number";
    case "ZodBoolean":
      return "boolean";
    case "ZodEnum":
    case "ZodNativeEnum":
      return "enum";
    case "ZodLiteral":
      return "literal";
    default:
      return "unknown";
  }
}

export function getObjectShape(
  schema: ZodTypeAny,
): Record<string, ZodTypeAny> | null {
  if (kindOf(schema) !== "object") return null;
  return (schema as unknown as z.ZodObject<z.ZodRawShape>).shape;
}

export function getArrayElement(schema: ZodTypeAny): ZodTypeAny | null {
  if (kindOf(schema) !== "array") return null;
  const def = schema._def as { type?: ZodTypeAny };
  return def.type ?? null;
}

export function getArrayMinLength(schema: ZodTypeAny): number {
  if (kindOf(schema) !== "array") return 0;
  const def = schema._def as { minLength?: { value: number } | null };
  return def.minLength?.value ?? 0;
}

export function getTupleItems(schema: ZodTypeAny): ZodTypeAny[] {
  if (kindOf(schema) !== "tuple") return [];
  const def = schema._def as { items?: ZodTypeAny[] };
  return def.items ?? [];
}

export function getEnumOptions(schema: ZodTypeAny): string[] {
  const def = schema._def as { values?: readonly string[] | Record<string, string | number> };
  if (Array.isArray(def.values)) return [...def.values];
  if (def.values && typeof def.values === "object") {
    return Object.values(def.values).filter(
      (v): v is string => typeof v === "string",
    );
  }
  return [];
}

export function getLiteralValue(schema: ZodTypeAny): unknown {
  const def = schema._def as { value?: unknown };
  return def.value;
}

export function getStringChecks(schema: ZodTypeAny): {
  minLength?: number;
  maxLength?: number;
  regex?: string;
} {
  const def = schema._def as { checks?: Array<{ kind: string; value?: number; regex?: RegExp }> };
  const out: { minLength?: number; maxLength?: number; regex?: string } = {};
  for (const c of def.checks ?? []) {
    if (c.kind === "min" && typeof c.value === "number") out.minLength = c.value;
    if (c.kind === "max" && typeof c.value === "number") out.maxLength = c.value;
    if (c.kind === "regex" && c.regex) out.regex = c.regex.source;
  }
  return out;
}

export function getNumberChecks(schema: ZodTypeAny): {
  min?: number;
  max?: number;
  int?: boolean;
} {
  const def = schema._def as { checks?: Array<{ kind: string; value?: number }> };
  const out: { min?: number; max?: number; int?: boolean } = {};
  for (const c of def.checks ?? []) {
    if (c.kind === "min" && typeof c.value === "number") out.min = c.value;
    if (c.kind === "max" && typeof c.value === "number") out.max = c.value;
    if (c.kind === "int") out.int = true;
  }
  return out;
}

export function defaultValueFor(schema: ZodTypeAny): unknown {
  const m = unwrapModifiers(schema);
  if (m.optional) return undefined;
  if (m.hasDefault) return m.defaultValue;
  const inner = m.inner;
  switch (kindOf(inner)) {
    case "object": {
      const shape = getObjectShape(inner) ?? {};
      const obj: Record<string, unknown> = {};
      for (const [k, child] of Object.entries(shape)) {
        const cm = unwrapModifiers(child);
        if (cm.optional) continue;
        obj[k] = defaultValueFor(child);
      }
      return obj;
    }
    case "array": {
      const min = getArrayMinLength(inner);
      const el = getArrayElement(inner);
      if (!el || min === 0) return [];
      return Array.from({ length: min }, () => defaultValueFor(el));
    }
    case "tuple":
      return getTupleItems(inner).map(defaultValueFor);
    case "string":
      return "";
    case "number":
      return 0;
    case "boolean":
      return false;
    case "enum": {
      const opts = getEnumOptions(inner);
      return opts[0] ?? "";
    }
    case "literal":
      return getLiteralValue(inner);
    default:
      return null;
  }
}

export function getSubSchema(
  schema: ZodTypeAny,
  path: ReadonlyArray<string | number>,
): ZodTypeAny | null {
  let cur: ZodTypeAny | null = schema;
  for (const seg of path) {
    if (!cur) return null;
    const m = unwrapModifiers(cur);
    cur = m.inner;
    const kind = kindOf(cur);
    if (kind === "object" && typeof seg === "string") {
      const shape = getObjectShape(cur);
      cur = shape?.[seg] ?? null;
    } else if (kind === "array" && typeof seg === "number") {
      cur = getArrayElement(cur);
    } else if (kind === "tuple" && typeof seg === "number") {
      cur = getTupleItems(cur)[seg] ?? null;
    } else {
      return null;
    }
  }
  return cur;
}

export function getSubValue(
  value: unknown,
  path: ReadonlyArray<string | number>,
): unknown {
  let cur: unknown = value;
  for (const seg of path) {
    if (cur == null) return undefined;
    if (typeof seg === "string" && typeof cur === "object") {
      cur = (cur as Record<string, unknown>)[seg];
    } else if (typeof seg === "number" && Array.isArray(cur)) {
      cur = cur[seg];
    } else {
      return undefined;
    }
  }
  return cur;
}

export function setSubValue(
  value: unknown,
  path: ReadonlyArray<string | number>,
  next: unknown,
): unknown {
  if (path.length === 0) return next;
  const [head, ...rest] = path;
  if (typeof head === "number") {
    const arr = Array.isArray(value) ? [...value] : [];
    arr[head] = setSubValue(arr[head], rest, next);
    return arr;
  }
  const obj =
    value && typeof value === "object" && !Array.isArray(value)
      ? { ...(value as Record<string, unknown>) }
      : {};
  obj[head] = setSubValue(obj[head], rest, next);
  return obj;
}
