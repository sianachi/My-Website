import { promises as fs } from "node:fs";

export type Meta = {
  title: string;
  description: string;
  canonical: string;
  ogType?: "website" | "article";
  ogImage?: string;
  publishedTime?: string;
  modifiedTime?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  noscriptHtml?: string;
};

let cachedHtml: string | null = null;
let cachedMtime = 0;

export async function loadIndexHtml(distIndexPath: string): Promise<string> {
  const stat = await fs.stat(distIndexPath);
  if (cachedHtml && stat.mtimeMs === cachedMtime) return cachedHtml;
  cachedHtml = await fs.readFile(distIndexPath, "utf8");
  cachedMtime = stat.mtimeMs;
  return cachedHtml;
}

export function siteUrl(): string {
  const rp = process.env.RP_ORIGIN;
  if (rp) return stripTrailingSlash(rp);
  return "http://localhost:5173";
}

export function absoluteUrl(pathname: string): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${siteUrl()}${path}`;
}

export function injectMeta(html: string, meta: Meta): string {
  const tags: string[] = [];

  tags.push(`<link rel="canonical" href="${escapeAttr(meta.canonical)}" />`);
  tags.push(
    `<link rel="alternate" type="application/atom+xml" title="Field notes" href="${escapeAttr(absoluteUrl("/feed.xml"))}" />`,
  );
  tags.push(
    `<meta property="og:title" content="${escapeAttr(meta.title)}" />`,
  );
  tags.push(
    `<meta property="og:description" content="${escapeAttr(meta.description)}" />`,
  );
  tags.push(
    `<meta property="og:type" content="${escapeAttr(meta.ogType ?? "website")}" />`,
  );
  tags.push(
    `<meta property="og:url" content="${escapeAttr(meta.canonical)}" />`,
  );
  if (meta.ogImage) {
    tags.push(
      `<meta property="og:image" content="${escapeAttr(meta.ogImage)}" />`,
    );
  }
  tags.push(`<meta name="twitter:card" content="summary_large_image" />`);
  tags.push(
    `<meta name="twitter:title" content="${escapeAttr(meta.title)}" />`,
  );
  tags.push(
    `<meta name="twitter:description" content="${escapeAttr(meta.description)}" />`,
  );
  if (meta.ogImage) {
    tags.push(
      `<meta name="twitter:image" content="${escapeAttr(meta.ogImage)}" />`,
    );
  }
  if (meta.ogType === "article") {
    if (meta.publishedTime) {
      tags.push(
        `<meta property="article:published_time" content="${escapeAttr(meta.publishedTime)}" />`,
      );
    }
    if (meta.modifiedTime) {
      tags.push(
        `<meta property="article:modified_time" content="${escapeAttr(meta.modifiedTime)}" />`,
      );
    }
  }
  if (meta.jsonLd) {
    const payload = Array.isArray(meta.jsonLd) ? meta.jsonLd : [meta.jsonLd];
    for (const obj of payload) {
      tags.push(
        `<script type="application/ld+json">${escapeJsonLd(obj)}</script>`,
      );
    }
  }

  let out = html.replace(
    /<title>[^<]*<\/title>/i,
    `<title>${escapeText(meta.title)}</title>`,
  );
  out = out.replace(
    /<meta\s+name="description"[^>]*>/i,
    `<meta name="description" content="${escapeAttr(meta.description)}" />`,
  );
  out = out.replace("</head>", `${tags.join("\n    ")}\n  </head>`);

  if (meta.noscriptHtml) {
    out = out.replace(
      '<div id="root"></div>',
      `<div id="root"></div>\n    <noscript>${meta.noscriptHtml}</noscript>`,
    );
  }

  return out;
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeJsonLd(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}

function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
