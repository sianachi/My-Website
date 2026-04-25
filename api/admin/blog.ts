import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getBlogPostsCollection, type BlogPostDoc } from "../_lib/mongo.js";
import { requireAdmin } from "../_lib/session.js";
import {
  AdminBlogListItemSchema,
  BlogCreateInputSchema,
  BlogPostSchema,
  BlogSlugSchema,
  BlogUpdateInputSchema,
  BLOG_STATUSES,
} from "../../src/shared/data/blog.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  const session = await requireAdmin(req, res);
  if (!session) return;

  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") return handleGet(req, res);
  if (req.method === "POST") return handlePost(req, res);
  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ message: "Method Not Allowed" });
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  const collection = await getBlogPostsCollection();
  const slug = readQuery(req.query.slug);

  if (slug) {
    const doc = await collection.findOne({ _id: slug });
    if (!doc) return res.status(404).json({ error: "not_found" });
    const parsed = BlogPostSchema.safeParse(toClient(doc));
    if (!parsed.success) {
      return res
        .status(500)
        .json({ error: "stored_data_invalid", issues: parsed.error.issues });
    }
    return res.status(200).json(parsed.data);
  }

  const docs = await collection
    .find({}, { projection: { content: 0 } })
    .sort({ updatedAt: -1 })
    .toArray();
  const posts = docs.map((doc) => AdminBlogListItemSchema.parse(toClient(doc)));
  return res.status(200).json({ posts });
}

type ActionBody =
  | { action: "create"; payload?: unknown }
  | { action: "update"; slug?: unknown; payload?: unknown }
  | { action: "set-status"; slug?: unknown; status?: unknown };

async function handlePost(req: VercelRequest, res: VercelResponse) {
  const body = (req.body ?? {}) as ActionBody;
  const collection = await getBlogPostsCollection();
  const now = new Date().toISOString();

  if (body.action === "create") {
    const input = BlogCreateInputSchema.safeParse(body.payload);
    if (!input.success) {
      return res
        .status(400)
        .json({ error: "validation_failed", issues: input.error.issues });
    }
    const existing = await collection.findOne(
      { _id: input.data.slug },
      { projection: { _id: 1 } },
    );
    if (existing) {
      return res.status(409).json({ error: "slug_taken" });
    }
    const doc: BlogPostDoc = {
      _id: input.data.slug,
      title: input.data.title,
      excerpt: input.data.excerpt ?? "",
      content: input.data.content,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };
    await collection.insertOne(doc);
    return res.status(201).json(BlogPostSchema.parse(toClient(doc)));
  }

  if (body.action === "update") {
    const slug = ensureSlug(body.slug);
    if (!slug) return res.status(400).json({ error: "invalid_slug" });
    const input = BlogUpdateInputSchema.safeParse(body.payload);
    if (!input.success) {
      return res
        .status(400)
        .json({ error: "validation_failed", issues: input.error.issues });
    }
    const update: Partial<BlogPostDoc> = { updatedAt: now };
    if (input.data.title !== undefined) update.title = input.data.title;
    if (input.data.excerpt !== undefined) update.excerpt = input.data.excerpt;
    if (input.data.content !== undefined) update.content = input.data.content;
    if (input.data.status !== undefined) {
      update.status = input.data.status;
      if (input.data.status === "published") {
        const existing = await collection.findOne(
          { _id: slug },
          { projection: { publishedAt: 1 } },
        );
        if (existing && !existing.publishedAt) update.publishedAt = now;
      }
    }
    const result = await collection.findOneAndUpdate(
      { _id: slug },
      { $set: update },
      { returnDocument: "after" },
    );
    if (!result) return res.status(404).json({ error: "not_found" });
    return res.status(200).json(BlogPostSchema.parse(toClient(result)));
  }

  if (body.action === "set-status") {
    const slug = ensureSlug(body.slug);
    if (!slug) return res.status(400).json({ error: "invalid_slug" });
    const status = body.status;
    if (typeof status !== "string" || !isStatus(status)) {
      return res.status(400).json({ error: "invalid_status" });
    }
    const update: Partial<BlogPostDoc> = { status, updatedAt: now };
    if (status === "published") {
      const existing = await collection.findOne(
        { _id: slug },
        { projection: { publishedAt: 1 } },
      );
      if (existing && !existing.publishedAt) update.publishedAt = now;
    }
    const result = await collection.findOneAndUpdate(
      { _id: slug },
      { $set: update },
      { returnDocument: "after" },
    );
    if (!result) return res.status(404).json({ error: "not_found" });
    return res.status(200).json(BlogPostSchema.parse(toClient(result)));
  }

  return res.status(400).json({ error: "unknown_action" });
}

function ensureSlug(value: unknown): string | null {
  const parsed = BlogSlugSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function isStatus(value: string): value is (typeof BLOG_STATUSES)[number] {
  return (BLOG_STATUSES as ReadonlyArray<string>).includes(value);
}

function readQuery(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  return null;
}

function toClient(doc: Partial<BlogPostDoc> & { _id: string }) {
  const { _id, ...rest } = doc;
  return { slug: _id, ...rest };
}
