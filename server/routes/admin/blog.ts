import { Router, type Request } from "express";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getBlogPostsCollection, type BlogPostDoc } from "../../lib/mongo.js";
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
const UPLOAD_ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

adminBlogRouter.post("/upload-token", async (req, res) => {
  const body = (req.body ?? {}) as HandleUploadBody;

  // Two body shapes hit this endpoint: a token request from the browser, and
  // an upload-completion webhook from Vercel Blob. Only gate the first on
  // requireAdmin — the webhook is authenticated by Blob's own signature.
  if (body.type !== "blob.upload-completed") {
    const session = await requireAdmin(req, res);
    if (!session) return;
  }

  try {
    const result = await handleUpload({
      body,
      request: toRequest(req),
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith(UPLOAD_PATH_PREFIX)) {
          throw new Error(`pathname must start with ${UPLOAD_PATH_PREFIX}`);
        }
        return {
          allowedContentTypes: UPLOAD_ALLOWED_TYPES,
          maximumSizeInBytes: UPLOAD_MAX_BYTES,
          addRandomSuffix: false,
          allowOverwrite: true,
        };
      },
      onUploadCompleted: async () => {
        // No-op: blog posts reference uploaded URLs directly via markdown.
      },
    });
    res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: message });
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

function toRequest(req: Request): globalThis.Request {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.join(", "));
  }
  const host = req.headers.host ?? "localhost";
  const url = `http://${host}${req.originalUrl ?? "/"}`;
  return new globalThis.Request(url, {
    method: req.method ?? "POST",
    headers,
  });
}
