/**
 * Shared SEO constants and URL helpers. The meta-tag injection that lived in
 * the old Express `server/lib/seo.ts` is gone — Next's `generateMetadata`,
 * `app/sitemap.ts`, `app/robots.ts`, and `app/feed.xml/route.ts` replace it.
 */

export const SITE_NAME = "Osinachi Nwagboso";
export const HOME_TITLE = "Osinachi Nwagboso — Portfolio · 2026";
export const HOME_DESCRIPTION =
  "Backend engineer — C# / .NET, Azure & AWS, edge systems. Based in Birmingham, UK.";
export const BLOG_INDEX_TITLE = "Field notes — Osinachi Nwagboso";
export const BLOG_INDEX_DESCRIPTION =
  "Writing on backend systems, edge infrastructure, and engineering practice.";

function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function siteUrl(): string {
  const rp = process.env.RP_ORIGIN;
  if (rp) return stripTrailingSlash(rp);
  return "http://localhost:3000";
}

export function absoluteUrl(pathname: string): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${siteUrl()}${path}`;
}

/** Escape `<` so a JSON-LD blob can't break out of its <script> tag. */
export function escapeJsonLd(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** CDATA can't contain `]]>`; split any occurrence safely. */
export function cdataSafe(value: string): string {
  return value.replace(/]]>/g, "]]]]><![CDATA[>");
}
