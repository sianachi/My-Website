/**
 * Stable, ASCII-only heading slug. Used in the same form by the server
 * renderer (for `<h2 id="…">`) and the client ToC builder so anchor links
 * resolve. Collisions inside one document are de-duplicated via uniqueSlug.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function uniqueSlug(base: string, used: Map<string, number>): string {
  const safe = base || "section";
  const seen = used.get(safe) ?? 0;
  used.set(safe, seen + 1);
  return seen === 0 ? safe : `${safe}-${seen + 1}`;
}
