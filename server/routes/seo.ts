import { Router } from "express";
import { getBlogPostsCollection } from "../lib/mongo.js";
import { getObjectAsString } from "../lib/s3.js";
import { renderPost } from "../lib/markdown.js";
import { absoluteUrl, siteUrl } from "../lib/seo.js";
import { blogContentKey } from "../../src/shared/data/blog.js";

const SITEMAP_CACHE = "public, s-maxage=3600, stale-while-revalidate=86400";
const FEED_CACHE = "public, s-maxage=3600, stale-while-revalidate=86400";
const FEED_AUTHOR = "Osinachi Nwagboso";
const FEED_TITLE = "Field notes — Osinachi Nwagboso";
const FEED_SUBTITLE =
  "Writing on backend systems, edge infrastructure, and engineering practice.";
const FEED_MAX_ENTRIES = 30;

export const seoRouter = Router();

seoRouter.get("/sitemap.xml", async (_req, res) => {
  const collection = await getBlogPostsCollection();
  const posts = await collection
    .find(
      { status: "published" },
      { projection: { _id: 1, updatedAt: 1, publishedAt: 1, tags: 1 } },
    )
    .sort({ publishedAt: -1 })
    .toArray();

  const entries: { loc: string; lastmod?: string; priority: string }[] = [
    { loc: absoluteUrl("/"), priority: "1.0" },
    { loc: absoluteUrl("/blog"), priority: "0.8" },
  ];

  const tagSet = new Set<string>();
  for (const post of posts) {
    entries.push({
      loc: absoluteUrl(`/blog/${post._id}`),
      lastmod: post.updatedAt ?? post.publishedAt,
      priority: "0.7",
    });
    for (const tag of post.tags ?? []) tagSet.add(tag);
  }
  for (const tag of [...tagSet].sort()) {
    entries.push({
      loc: absoluteUrl(`/blog/tag/${tag}`),
      priority: "0.5",
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

seoRouter.get("/feed.xml", async (_req, res) => {
  const collection = await getBlogPostsCollection();
  const docs = await collection
    .find({ status: "published" })
    .sort({ publishedAt: -1 })
    .limit(FEED_MAX_ENTRIES)
    .toArray();

  const feedUrl = absoluteUrl("/feed.xml");
  const siteHome = siteUrl();
  const updated = docs[0]?.updatedAt ?? docs[0]?.publishedAt ?? new Date().toISOString();

  const entries = await Promise.all(
    docs.map(async (doc) => {
      const md = await getObjectAsString(doc.s3ContentKey ?? blogContentKey(doc._id));
      const html = md ? (await renderPost(md)).html : "";
      const link = absoluteUrl(`/blog/${doc._id}`);
      return {
        id: link,
        link,
        title: doc.title,
        published: doc.publishedAt ?? doc.updatedAt,
        updated: doc.updatedAt ?? doc.publishedAt,
        summary: doc.excerpt ?? "",
        contentHtml: html,
        tags: doc.tags ?? [],
      };
    }),
  );

  const body = renderAtom({
    feedUrl,
    siteHome,
    title: FEED_TITLE,
    subtitle: FEED_SUBTITLE,
    author: FEED_AUTHOR,
    updated,
    entries,
  });
  res.setHeader("Content-Type", "application/atom+xml; charset=utf-8");
  res.setHeader("Cache-Control", FEED_CACHE);
  res.status(200).send(body);
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

type AtomFeed = {
  feedUrl: string;
  siteHome: string;
  title: string;
  subtitle: string;
  author: string;
  updated: string;
  entries: {
    id: string;
    link: string;
    title: string;
    published?: string;
    updated?: string;
    summary?: string;
    contentHtml: string;
    tags: readonly string[];
  }[];
};

function renderAtom(feed: AtomFeed): string {
  const entries = feed.entries
    .map((e) => {
      const cats = e.tags
        .map((t) => `    <category term="${escapeXml(t)}" />`)
        .join("\n");
      const parts = [
        `    <id>${escapeXml(e.id)}</id>`,
        `    <title>${escapeXml(e.title)}</title>`,
        `    <link rel="alternate" type="text/html" href="${escapeXml(e.link)}" />`,
      ];
      if (e.published) parts.push(`    <published>${escapeXml(e.published)}</published>`);
      if (e.updated) parts.push(`    <updated>${escapeXml(e.updated)}</updated>`);
      if (cats) parts.push(cats);
      if (e.summary)
        parts.push(`    <summary>${escapeXml(e.summary)}</summary>`);
      parts.push(
        `    <content type="html"><![CDATA[${cdataSafe(e.contentHtml)}]]></content>`,
      );
      return `  <entry>\n${parts.join("\n")}\n  </entry>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>${escapeXml(feed.feedUrl)}</id>
  <title>${escapeXml(feed.title)}</title>
  <subtitle>${escapeXml(feed.subtitle)}</subtitle>
  <link rel="self" type="application/atom+xml" href="${escapeXml(feed.feedUrl)}" />
  <link rel="alternate" type="text/html" href="${escapeXml(feed.siteHome)}/blog" />
  <updated>${escapeXml(feed.updated)}</updated>
  <author>
    <name>${escapeXml(feed.author)}</name>
    <uri>${escapeXml(feed.siteHome)}</uri>
  </author>
${entries}
</feed>
`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cdataSafe(value: string): string {
  // CDATA can't contain `]]>`. Split it safely.
  return value.replace(/]]>/g, "]]]]><![CDATA[>");
}
