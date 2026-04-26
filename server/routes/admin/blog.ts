import { Router } from "express";
import { getBlogPostsCollection, type BlogPostDoc } from "../../lib/mongo.js";
import {
  deleteObject,
  getObjectAsString,
  listObjects,
  presignPutUrl,
  publicUrl,
  putObject,
} from "../../lib/s3.js";
import { requireAdmin } from "../../lib/session.js";
import {
  AdminBlogListItemSchema,
  BlogCreateInputSchema,
  BlogPostSchema,
  BlogSlugSchema,
  BlogUpdateInputSchema,
  BLOG_STATUSES,
  blogContentKey,
  blogPrefix,
  isSafeBlogFilename,
  BLOG_BODY_FILENAME,
} from "../../../src/shared/data/blog.js";

export const adminBlogRouter = Router();

const UPLOAD_MAX_BYTES = 32 * 1024 * 1024;

/**
 * Parse a path like `blog/<slug>/<filename>` and verify both segments are
 * safe. Returns null on any violation (bad slug, body filename, traversal,
 * subfolder). The body file (`post.md`) is editor-managed and rejected here.
 */
function parseBlogAssetPath(
  pathname: string,
): { slug: string; filename: string } | null {
  if (typeof pathname !== "string") return null;
  if (!pathname.startsWith("blog/")) return null;
  if (pathname.includes("..")) return null;
  const rest = pathname.slice("blog/".length);
  const slash = rest.indexOf("/");
  if (slash < 1) return null;
  const slug = rest.slice(0, slash);
  const filename = rest.slice(slash + 1);
  if (!BlogSlugSchema.safeParse(slug).success) return null;
  if (!isSafeBlogFilename(filename)) return null;
  return { slug, filename };
}

adminBlogRouter.post("/upload-token", async (req, res) => {
  const session = await requireAdmin(req, res);
  if (!session) return;

  const body = (req.body ?? {}) as {
    pathname?: unknown;
    contentType?: unknown;
    contentLength?: unknown;
  };

  const pathname = typeof body.pathname === "string" ? body.pathname : "";
  const contentType =
    typeof body.contentType === "string" ? body.contentType : "";
  const parsed = parseBlogAssetPath(pathname);
  if (!parsed) {
    res.status(400).json({
      error: `pathname must be blog/<slug>/<filename>; '${BLOG_BODY_FILENAME}' is reserved`,
    });
    return;
  }
  if (contentType.length === 0) {
    res.status(400).json({ error: "contentType is required" });
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
    const uploadUrl = await presignPutUrl(pathname, contentType, 60);
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      uploadUrl,
      publicUrl: publicUrl(pathname),
      key: pathname,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

adminBlogRouter.get("/files", async (req, res) => {
  const session = await requireAdmin(req, res);
  if (!session) return;

  res.setHeader("Cache-Control", "no-store");

  const slug = readQuery(req.query.slug);
  if (!slug || !BlogSlugSchema.safeParse(slug).success) {
    res.status(400).json({ error: "invalid_slug" });
    return;
  }

  // Confirm the post exists before exposing folder contents.
  const collection = await getBlogPostsCollection();
  const exists = await collection.findOne(
    { _id: slug },
    { projection: { _id: 1 } },
  );
  if (!exists) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  const prefix = blogPrefix(slug);
  const objects = await listObjects(prefix);
  const files = objects
    .map((obj) => {
      const filename = obj.key.slice(prefix.length);
      return {
        filename,
        key: obj.key,
        size: obj.size,
        lastModified: obj.lastModified,
        url: publicUrl(obj.key),
      };
    })
    .filter((f) => f.filename && f.filename !== BLOG_BODY_FILENAME)
    .sort((a, b) => {
      const at = a.lastModified ?? "";
      const bt = b.lastModified ?? "";
      return at < bt ? 1 : at > bt ? -1 : 0;
    });

  res.status(200).json({ slug, files });
});

adminBlogRouter.post("/files/delete", async (req, res) => {
  const session = await requireAdmin(req, res);
  if (!session) return;

  res.setHeader("Cache-Control", "no-store");

  const body = (req.body ?? {}) as { slug?: unknown; filename?: unknown };
  if (
    typeof body.slug !== "string" ||
    !BlogSlugSchema.safeParse(body.slug).success
  ) {
    res.status(400).json({ error: "invalid_slug" });
    return;
  }
  if (typeof body.filename !== "string" || !isSafeBlogFilename(body.filename)) {
    res.status(400).json({ error: "invalid_filename" });
    return;
  }

  const collection = await getBlogPostsCollection();
  const exists = await collection.findOne(
    { _id: body.slug },
    { projection: { _id: 1 } },
  );
  if (!exists) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  await deleteObject(`${blogPrefix(body.slug)}${body.filename}`);
  res.status(200).json({ ok: true });
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
    const content =
      (await getObjectAsString(doc.s3ContentKey ?? blogContentKey(doc._id))) ??
      "";
    const parsed = BlogPostSchema.safeParse({ ...toClient(doc), content });
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
    .find({})
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
    const key = blogContentKey(input.data.slug);
    await putObject(key, input.data.content, "text/markdown; charset=utf-8");
    const doc: BlogPostDoc = {
      _id: input.data.slug,
      title: input.data.title,
      excerpt: input.data.excerpt ?? "",
      s3ContentKey: key,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };
    await collection.insertOne(doc);
    res
      .status(201)
      .json(
        BlogPostSchema.parse({ ...toClient(doc), content: input.data.content }),
      );
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
    const existing = await collection.findOne({ _id: slug });
    if (!existing) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    const update: Partial<BlogPostDoc> = { updatedAt: now };
    if (input.data.title !== undefined) update.title = input.data.title;
    if (input.data.excerpt !== undefined) update.excerpt = input.data.excerpt;
    if (input.data.status !== undefined) {
      update.status = input.data.status;
      if (input.data.status === "published" && !existing.publishedAt) {
        update.publishedAt = now;
      }
    }

    const key = existing.s3ContentKey ?? blogContentKey(slug);
    let content: string;
    if (input.data.content !== undefined) {
      content = input.data.content;
      await putObject(key, content, "text/markdown; charset=utf-8");
      if (!existing.s3ContentKey) update.s3ContentKey = key;
    } else {
      content = (await getObjectAsString(key)) ?? "";
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
    res.status(200).json(BlogPostSchema.parse({ ...toClient(result), content }));
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
    const existing = await collection.findOne({ _id: slug });
    if (!existing) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    const update: Partial<BlogPostDoc> = { status, updatedAt: now };
    if (status === "published" && !existing.publishedAt) {
      update.publishedAt = now;
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
    const content =
      (await getObjectAsString(result.s3ContentKey ?? blogContentKey(slug))) ??
      "";
    res.status(200).json(BlogPostSchema.parse({ ...toClient(result), content }));
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
  const { _id, s3ContentKey: _key, ...rest } = doc;
  return { slug: _id, ...rest };
}
