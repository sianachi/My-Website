import { Router } from "express";
import { getBlogPostsCollection, type BlogPostDoc } from "../../lib/mongo.js";
import { presignPutUrl, publicUrl } from "../../lib/s3.js";
import { requireAdmin } from "../../lib/session.js";
import {
  AdminBlogListItemSchema,
  BlogCreateInputSchema,
  BlogPostSchema,
  BlogSlugSchema,
  BlogUpdateInputSchema,
  BLOG_STATUSES,
} from "../../../src/shared/data/blog.js";

export const adminBlogRouter = Router();

const UPLOAD_PATH_PREFIX = "blog/images/";
const UPLOAD_MAX_BYTES = 8 * 1024 * 1024;
const UPLOAD_ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

// Reject path-traversal and absolute paths. The browser-supplied pathname
// must stay under blog/images/ — anything else is rejected.
const SAFE_PATH = /^[a-zA-Z0-9._\-/]+$/;

adminBlogRouter.post("/upload-token", async (req, res) => {
  const session = await requireAdmin(req, res);
  if (!session) return;

  const body = (req.body ?? {}) as {
    pathname?: unknown;
    contentType?: unknown;
    contentLength?: unknown;
  };

  if (
    typeof body.pathname !== "string" ||
    !body.pathname.startsWith(UPLOAD_PATH_PREFIX) ||
    body.pathname.includes("..") ||
    !SAFE_PATH.test(body.pathname)
  ) {
    res
      .status(400)
      .json({ error: `pathname must start with ${UPLOAD_PATH_PREFIX}` });
    return;
  }
  if (
    typeof body.contentType !== "string" ||
    !UPLOAD_ALLOWED_TYPES.has(body.contentType)
  ) {
    res.status(400).json({ error: "unsupported_content_type" });
    return;
  }
  if (
    typeof body.contentLength !== "number" ||
    !Number.isFinite(body.contentLength) ||
    body.contentLength <= 0 ||
    body.contentLength > UPLOAD_MAX_BYTES
  ) {
    res
      .status(400)
      .json({ error: `contentLength must be 1..${UPLOAD_MAX_BYTES} bytes` });
    return;
  }

  try {
    const uploadUrl = await presignPutUrl(body.pathname, body.contentType, 60);
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      uploadUrl,
      publicUrl: publicUrl(body.pathname),
      key: body.pathname,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

adminBlogRouter.get("/", async (req, res) => {
  const session = await requireAdmin(req, res);
  if (!session) return;

  res.setHeader("Cache-Control", "no-store");

  const collection = await getBlogPostsCollection();
  const slug = readQuery(req.query.slug);

  if (slug) {
    const doc = await collection.findOne({ _id: slug });
    if (!doc) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    const parsed = BlogPostSchema.safeParse(toClient(doc));
    if (!parsed.success) {
      res
        .status(500)
        .json({ error: "stored_data_invalid", issues: parsed.error.issues });
      return;
    }
    res.status(200).json(parsed.data);
    return;
  }

  const docs = await collection
    .find({}, { projection: { content: 0 } })
    .sort({ updatedAt: -1 })
    .toArray();
  const posts = docs.map((doc) => AdminBlogListItemSchema.parse(toClient(doc)));
  res.status(200).json({ posts });
});

type ActionBody =
  | { action: "create"; payload?: unknown }
  | { action: "update"; slug?: unknown; payload?: unknown }
  | { action: "set-status"; slug?: unknown; status?: unknown };

adminBlogRouter.post("/", async (req, res) => {
  const session = await requireAdmin(req, res);
  if (!session) return;

  res.setHeader("Cache-Control", "no-store");

  const body = (req.body ?? {}) as ActionBody;
  const collection = await getBlogPostsCollection();
  const now = new Date().toISOString();

  if (body.action === "create") {
    const input = BlogCreateInputSchema.safeParse(body.payload);
    if (!input.success) {
      res
        .status(400)
        .json({ error: "validation_failed", issues: input.error.issues });
      return;
    }
    const existing = await collection.findOne(
      { _id: input.data.slug },
      { projection: { _id: 1 } },
    );
    if (existing) {
      res.status(409).json({ error: "slug_taken" });
      return;
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
    res.status(201).json(BlogPostSchema.parse(toClient(doc)));
    return;
  }

  if (body.action === "update") {
    const slug = ensureSlug(body.slug);
    if (!slug) {
      res.status(400).json({ error: "invalid_slug" });
      return;
    }
    const input = BlogUpdateInputSchema.safeParse(body.payload);
    if (!input.success) {
      res
        .status(400)
        .json({ error: "validation_failed", issues: input.error.issues });
      return;
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
    if (!result) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.status(200).json(BlogPostSchema.parse(toClient(result)));
    return;
  }

  if (body.action === "set-status") {
    const slug = ensureSlug(body.slug);
    if (!slug) {
      res.status(400).json({ error: "invalid_slug" });
      return;
    }
    const status = body.status;
    if (typeof status !== "string" || !isStatus(status)) {
      res.status(400).json({ error: "invalid_status" });
      return;
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
    if (!result) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.status(200).json(BlogPostSchema.parse(toClient(result)));
    return;
  }

  res.status(400).json({ error: "unknown_action" });
});

function ensureSlug(value: unknown): string | null {
  const parsed = BlogSlugSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function isStatus(value: string): value is (typeof BLOG_STATUSES)[number] {
  return (BLOG_STATUSES as ReadonlyArray<string>).includes(value);
}

function readQuery(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  return null;
}

function toClient(doc: Partial<BlogPostDoc> & { _id: string }) {
  const { _id, ...rest } = doc;
  return { slug: _id, ...rest };
}
