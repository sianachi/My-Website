import { Router } from "express";
import { getBlogPostsCollection, type BlogPostDoc } from "../lib/mongo.js";
import { getObjectAsString } from "../lib/s3.js";
import { renderPost } from "../lib/markdown.js";
import {
  BlogPostListItemSchema,
  BlogPostSchema,
  BlogTagSchema,
  blogContentKey,
} from "../../src/shared/data/blog.js";

const CACHE_HEADER = "public, s-maxage=3600, stale-while-revalidate=86400";

export const blogRouter = Router();

blogRouter.get("/neighbors", async (req, res) => {
  const slug = readQuery(req.query.slug);
  if (!slug) {
    res.status(400).json({ error: "slug is required" });
    return;
  }
  const collection = await getBlogPostsCollection();
  const current = await collection.findOne({ _id: slug, status: "published" });
  if (!current || !current.publishedAt) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const [newer, older] = await Promise.all([
    collection
      .find({
        status: "published",
        publishedAt: { $gt: current.publishedAt },
      })
      .sort({ publishedAt: 1 })
      .limit(1)
      .toArray(),
    collection
      .find({
        status: "published",
        publishedAt: { $lt: current.publishedAt },
      })
      .sort({ publishedAt: -1 })
      .limit(1)
      .toArray(),
  ]);
  res.setHeader("Cache-Control", CACHE_HEADER);
  res.status(200).json({
    next: newer[0] ? listItem(newer[0]) : null,
    prev: older[0] ? listItem(older[0]) : null,
  });
});

blogRouter.get("/related", async (req, res) => {
  const slug = readQuery(req.query.slug);
  if (!slug) {
    res.status(400).json({ error: "slug is required" });
    return;
  }
  const collection = await getBlogPostsCollection();
  const current = await collection.findOne({ _id: slug, status: "published" });
  if (!current) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const tags = current.tags ?? [];

  const others = await collection
    .find({ _id: { $ne: slug }, status: "published" })
    .sort({ publishedAt: -1 })
    .toArray();

  const ranked = others
    .map((doc) => ({
      doc,
      shared: countShared(doc.tags ?? [], tags),
    }))
    .sort((a, b) => {
      if (b.shared !== a.shared) return b.shared - a.shared;
      const ap = a.doc.publishedAt ?? "";
      const bp = b.doc.publishedAt ?? "";
      return ap < bp ? 1 : ap > bp ? -1 : 0;
    })
    .slice(0, 3)
    .map((r) => listItem(r.doc));

  res.setHeader("Cache-Control", CACHE_HEADER);
  res.status(200).json({ posts: ranked });
});

blogRouter.get("/", async (req, res) => {
  const slugParam = readQuery(req.query.slug);
  const tagParam = readQuery(req.query.tag);
  const collection = await getBlogPostsCollection();

  if (slugParam) {
    const doc = await collection.findOne({
      _id: slugParam,
      status: "published",
    });
    if (!doc) {
      res.status(404).json({ message: "Not Found" });
      return;
    }
    const content = await getObjectAsString(
      doc.s3ContentKey ?? blogContentKey(doc._id),
    );
    if (content === null) {
      res.status(503).json({ message: "Post body missing" });
      return;
    }
    const { html, readingMinutes } = await renderPost(content);
    const post = BlogPostSchema.parse({
      ...toClient(doc),
      content,
      html,
      // Persisted readingMinutes wins; otherwise return the just-computed one
      // so older docs (pre-migration) still ship a value to the reader.
      readingMinutes: doc.readingMinutes ?? readingMinutes,
    });
    res.setHeader("Cache-Control", CACHE_HEADER);
    res.status(200).json(post);
    return;
  }

  const filter: Record<string, unknown> = { status: "published" };
  if (tagParam) {
    const tag = BlogTagSchema.safeParse(tagParam);
    if (!tag.success) {
      res.status(400).json({ error: "invalid_tag" });
      return;
    }
    filter.tags = tag.data;
  }

  const docs = await collection
    .find(filter)
    .sort({ publishedAt: -1 })
    .toArray();
  const posts = docs.map((doc) => listItem(doc));
  res.setHeader("Cache-Control", CACHE_HEADER);
  res.status(200).json({ posts });
});

function listItem(doc: BlogPostDoc) {
  return BlogPostListItemSchema.parse(toClient(doc));
}

function readQuery(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  return null;
}

function toClient(doc: Partial<BlogPostDoc> & { _id: string }) {
  const { _id, s3ContentKey: _key, ...rest } = doc;
  return { slug: _id, ...rest };
}

function countShared(a: readonly string[], b: readonly string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const set = new Set(a);
  let n = 0;
  for (const t of b) if (set.has(t)) n += 1;
  return n;
}
