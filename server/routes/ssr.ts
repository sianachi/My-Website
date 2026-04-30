import path from "node:path";
import type { RequestHandler } from "express";
import { getBlogPostsCollection, getContentCollection } from "../lib/mongo.js";
import { getObjectAsString } from "../lib/s3.js";
import { renderMarkdownToHtml } from "../lib/markdown.js";
import { absoluteUrl, injectMeta, loadIndexHtml, siteUrl } from "../lib/seo.js";
import { blogContentKey, BlogTagSchema } from "../../src/shared/data/blog.js";
import {
  AboutContentSchema,
  ContactContentSchema,
  CoverContentSchema,
  WorkContentSchema,
} from "../../src/shared/data/schemas.js";

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

      const tagMatch = /^\/blog\/tag\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/.exec(
        req.path,
      );
      if (tagMatch) {
        const html = await renderBlogTag(indexPath, tagMatch[1]);
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
  const noscriptHtml = await buildHomeNoscript();
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
    noscriptHtml,
  });
}

async function buildHomeNoscript(): Promise<string | undefined> {
  try {
    const collection = await getContentCollection();
    const docs = await collection
      .find({ _id: { $in: ["cover", "about", "work", "contact"] } })
      .toArray();
    if (docs.length < 4) return undefined;

    const byId = new Map(docs.map((d) => [d._id, d]));
    const cover = CoverContentSchema.safeParse(byId.get("cover"));
    const about = AboutContentSchema.safeParse(byId.get("about"));
    const work = WorkContentSchema.safeParse(byId.get("work"));
    const contact = ContactContentSchema.safeParse(byId.get("contact"));
    if (!cover.success || !about.success || !work.success || !contact.success) {
      return undefined;
    }

    const sections: string[] = [];

    sections.push(
      `<header><h1>${SITE_NAME}</h1><p>${cover.data.lede}</p></header>`,
    );

    const aboutParts = [
      `<p>${about.data.bio.lede}</p>`,
      ...about.data.bio.paragraphs.map((p) => `<p>${p}</p>`),
      `<h3>Education</h3><ul>${about.data.education
        .map((e) => `<li>${e.value}</li>`)
        .join("")}</ul>`,
      `<h3>Skills</h3><ul>${about.data.skills
        .map((s) => `<li>${s.value}</li>`)
        .join("")}</ul>`,
    ];
    sections.push(`<section><h2>About</h2>${aboutParts.join("")}</section>`);

    const workParts = work.data.cards.map((card) => {
      const meta = card.meta
        .map(
          (m) =>
            `<dt>${escapeText(m.label)}</dt><dd>${escapeText(m.value)}</dd>`,
        )
        .join("");
      const notes = card.notes.map((n) => `<p>${n}</p>`).join("");
      return `<article><h3>${card.title}</h3><p><small>${escapeText(card.year)}</small></p><p>${card.lede}</p><dl>${meta}</dl>${notes}</article>`;
    });
    sections.push(
      `<section><h2>Selected Work</h2>${workParts.join("")}</section>`,
    );

    const links = contact.data.links
      .map(
        (l) =>
          `<li>${escapeText(l.label)}: <a href="${escapeAttr(l.href)}">${escapeText(l.value)}</a></li>`,
      )
      .join("");
    sections.push(
      `<section><h2>Contact</h2><p>${escapeText(contact.data.signoff)}</p><ul>${links}</ul></section>`,
    );

    return sections.join("");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[ssr] noscript home failed: ${msg}`);
    return undefined;
  }
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

  const noscriptHtml = posts.length
    ? `<header><h1>Field notes</h1><p>${escapeText(BLOG_INDEX_DESCRIPTION)}</p></header><ul>${posts
        .map((p) => {
          const url = absoluteUrl(`/blog/${p._id}`);
          const excerpt = p.excerpt && p.excerpt.trim()
            ? `<p>${escapeText(p.excerpt)}</p>`
            : "";
          return `<li><a href="${escapeAttr(url)}">${escapeText(p.title)}</a>${excerpt}</li>`;
        })
        .join("")}</ul>`
    : undefined;

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
    noscriptHtml,
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
      ? `<article><h1>${escapeText(doc.title)}</h1>${await renderMarkdownToHtml(body)}</article>`
      : undefined;

  return injectMeta(html, {
    title: `${doc.title} — ${SITE_NAME}`,
    description,
    canonical,
    ogType: "article",
    ogImage: doc.coverImage,
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
      ...(doc.coverImage ? { image: doc.coverImage } : {}),
      ...(doc.tags && doc.tags.length > 0 ? { keywords: doc.tags.join(", ") } : {}),
    },
    noscriptHtml,
  });
}

async function renderBlogTag(
  indexPath: string,
  tag: string,
): Promise<string> {
  const html = await loadIndexHtml(indexPath);
  const tagParse = BlogTagSchema.safeParse(tag);
  const safeTag = tagParse.success ? tagParse.data : tag;
  const canonical = absoluteUrl(`/blog/tag/${safeTag}`);
  const title = `Posts tagged "${safeTag}" — ${SITE_NAME}`;
  const description = `Field-notes posts tagged ${safeTag}.`;

  const collection = await getBlogPostsCollection();
  const posts = tagParse.success
    ? await collection
        .find(
          { status: "published", tags: tagParse.data },
          { projection: { _id: 1, title: 1, publishedAt: 1, updatedAt: 1 } },
        )
        .sort({ publishedAt: -1 })
        .toArray()
    : [];

  return injectMeta(html, {
    title,
    description,
    canonical,
    ogType: "website",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: title,
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

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
