export type ParseResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function tryParseJson(text: string): ParseResult {
  try {
    return { ok: true, data: JSON.parse(text) as unknown };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
