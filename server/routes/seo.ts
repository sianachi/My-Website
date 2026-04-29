import { Router } from "express";
import { getBlogPostsCollection } from "../lib/mongo.js";
import { absoluteUrl, siteUrl } from "../lib/seo.js";

const SITEMAP_CACHE = "public, s-maxage=3600, stale-while-revalidate=86400";

export const seoRouter = Router();

seoRouter.get("/sitemap.xml", async (_req, res) => {
  const collection = await getBlogPostsCollection();
  const posts = await collection
    .find({ status: "published" }, { projection: { _id: 1, updatedAt: 1, publishedAt: 1 } })
    .sort({ publishedAt: -1 })
    .toArray();

  const entries: { loc: string; lastmod?: string; priority: string }[] = [
    { loc: absoluteUrl("/"), priority: "1.0" },
    { loc: absoluteUrl("/blog"), priority: "0.8" },
  ];

  for (const post of posts) {
    entries.push({
      loc: absoluteUrl(`/blog/${post._id}`),
      lastmod: post.updatedAt ?? post.publishedAt,
      priority: "0.7",
    });
  }

  const body = renderSitemap(entries);
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", SITEMAP_CACHE);
  res.status(200).send(body);
});

seoRouter.get("/robots.txt", (_req, res) => {
  const lines = [
    "User-agent: *",
    "Disallow: /core",
    "Disallow: /core/",
    "Disallow: /api/admin",
    "Disallow: /api/admin/",
    "",
    `Sitemap: ${siteUrl()}/sitemap.xml`,
    "",
  ];
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=86400");
  res.status(200).send(lines.join("\n"));
});

function renderSitemap(
  entries: { loc: string; lastmod?: string; priority: string }[],
): string {
  const items = entries
    .map((e) => {
      const parts = [
        `    <loc>${escapeXml(e.loc)}</loc>`,
        `    <priority>${e.priority}</priority>`,
      ];
      if (e.lastmod) parts.unshift(`    <lastmod>${escapeXml(e.lastmod)}</lastmod>`);
      return `  <url>\n${parts.join("\n")}\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>\n`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
