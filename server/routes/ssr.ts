import path from "node:path";
import type { RequestHandler } from "express";
import { getBlogPostsCollection } from "../lib/mongo.js";
import { getObjectAsString } from "../lib/s3.js";
import { renderMarkdownToHtml } from "../lib/markdown.js";
import { absoluteUrl, injectMeta, loadIndexHtml, siteUrl } from "../lib/seo.js";
import { blogContentKey } from "../../src/shared/data/blog.js";

const HTML_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400",
} as const;

const SITE_NAME = "Osinachi Nwagboso";
const HOME_TITLE = "Osinachi Nwagboso — Portfolio · 2026";
const HOME_DESCRIPTION =
  "Backend engineer — C# / .NET, Azure & AWS, edge systems. Based in Birmingham, UK.";
const BLOG_INDEX_TITLE = "Field notes — Osinachi Nwagboso";
const BLOG_INDEX_DESCRIPTION =
  "Writing on backend systems, edge infrastructure, and engineering practice.";

export function createSsrMiddleware(distDir: string): RequestHandler {
  const indexPath = path.join(distDir, "index.html");

  return async (req, res, next) => {
    if (req.method !== "GET") return next();
    const accept = req.headers.accept ?? "";
    if (!accept.includes("text/html")) return next();

    try {
      if (req.path === "/" || req.path === "") {
        const html = await renderHome(indexPath);
        res.set(HTML_HEADERS).status(200).send(html);
        return;
      }

      if (req.path === "/blog" || req.path === "/blog/") {
        const html = await renderBlogIndex(indexPath);
        res.set(HTML_HEADERS).status(200).send(html);
        return;
      }

      const postMatch = /^\/blog\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/.exec(req.path);
      if (postMatch) {
        const result = await renderBlogPost(indexPath, postMatch[1]);
        if (result === null) {
          // Fall through to SPA so the client renders the 404 state.
          return next();
        }
        res.set(HTML_HEADERS).status(200).send(result);
        return;
      }

      return next();
    } catch (err) {
      // Never block the app on SSR failure — fall through to the SPA shell.
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[ssr] ${req.path} -> ${msg}`);
      return next();
    }
  };
}

async function renderHome(indexPath: string): Promise<string> {
  const html = await loadIndexHtml(indexPath);
  const canonical = absoluteUrl("/");
  return injectMeta(html, {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    canonical,
    ogType: "website",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Person",
      name: SITE_NAME,
      jobTitle: "Backend Engineer",
      url: canonical,
      address: {
        "@type": "PostalAddress",
        addressLocality: "Birmingham",
        addressCountry: "UK",
      },
    },
  });
}

async function renderBlogIndex(indexPath: string): Promise<string> {
  const html = await loadIndexHtml(indexPath);
  const canonical = absoluteUrl("/blog");
  const collection = await getBlogPostsCollection();
  const posts = await collection
    .find(
      { status: "published" },
      { projection: { _id: 1, title: 1, excerpt: 1, publishedAt: 1, updatedAt: 1 } },
    )
    .sort({ publishedAt: -1 })
    .toArray();

  return injectMeta(html, {
    title: BLOG_INDEX_TITLE,
    description: BLOG_INDEX_DESCRIPTION,
    canonical,
    ogType: "website",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: BLOG_INDEX_TITLE,
      url: canonical,
      author: { "@type": "Person", name: SITE_NAME },
      blogPost: posts.map((p) => ({
        "@type": "BlogPosting",
        headline: p.title,
        url: absoluteUrl(`/blog/${p._id}`),
        datePublished: p.publishedAt,
        dateModified: p.updatedAt,
      })),
    },
  });
}

async function renderBlogPost(
  indexPath: string,
  slug: string,
): Promise<string | null> {
  const collection = await getBlogPostsCollection();
  const doc = await collection.findOne({ _id: slug, status: "published" });
  if (!doc) return null;

  const html = await loadIndexHtml(indexPath);
  const canonical = absoluteUrl(`/blog/${slug}`);
  const description =
    (doc.excerpt && doc.excerpt.trim()) || BLOG_INDEX_DESCRIPTION;

  const body = await getObjectAsString(doc.s3ContentKey ?? blogContentKey(slug));
  const noscriptHtml =
    body !== null
      ? `<article><h1>${escapeText(doc.title)}</h1>${renderMarkdownToHtml(body)}</article>`
      : undefined;

  return injectMeta(html, {
    title: `${doc.title} — ${SITE_NAME}`,
    description,
    canonical,
    ogType: "article",
    publishedTime: doc.publishedAt,
    modifiedTime: doc.updatedAt,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: doc.title,
      description,
      datePublished: doc.publishedAt,
      dateModified: doc.updatedAt,
      author: { "@type": "Person", name: SITE_NAME, url: siteUrl() },
      mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
      url: canonical,
    },
    noscriptHtml,
  });
}

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
