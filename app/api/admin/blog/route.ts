import { NextResponse } from "next/server";
import { getBlogPostsCollection, type BlogPostDoc } from "@/server/lib/mongo";
import { getObjectAsString, putObject } from "@/server/lib/s3";
import { renderPost } from "@/server/lib/markdown";
import { errorResponse, withAdmin } from "@/server/lib/route-helpers";
import {
  AdminBlogListItemSchema,
  BlogCreateInputSchema,
  BlogPostSchema,
  BlogSlugSchema,
  BlogUpdateInputSchema,
  BLOG_STATUSES,
  blogContentKey,
  normalizeTags,
} from "@/shared/data/blog";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

function readQuery(value: string | null): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  return null;
}

function toClient(doc: Partial<BlogPostDoc> & { _id: string }) {
  const { _id, s3ContentKey: _key, ...rest } = doc;
  return { slug: _id, ...rest };
}

function ensureSlug(value: unknown): string | null {
  const parsed = BlogSlugSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function isStatus(value: string): value is (typeof BLOG_STATUSES)[number] {
  return (BLOG_STATUSES as ReadonlyArray<string>).includes(value);
}

/**
 * Compute folio + folioTotal for an admin response. Mirrors the listing's
 * updatedAt-desc ordering: oldest = 001, newest = total.
 */
async function folioFor(
  collection: Awaited<ReturnType<typeof getBlogPostsCollection>>,
  doc: BlogPostDoc,
): Promise<{ folio: number; folioTotal: number }> {
  const folioTotal = await collection.countDocuments({});
  const olderCount = await collection.countDocuments({
    updatedAt: { $lt: doc.updatedAt },
  });
  return { folio: olderCount + 1, folioTotal };
}

export const GET = withAdmin(async (_session, req: Request): Promise<Response> => {
  try {
    const collection = await getBlogPostsCollection();
    const slug = readQuery(new URL(req.url).searchParams.get("slug"));

    if (slug) {
      const doc = await collection.findOne({ _id: slug });
      if (!doc) {
        return NextResponse.json(
          { error: "not_found" },
          { status: 404, headers: NO_STORE },
        );
      }
      const content =
        (await getObjectAsString(doc.s3ContentKey ?? blogContentKey(doc._id))) ??
        "";
      // Folio derivation: position across all admin docs sorted by updatedAt
      // ascending — oldest = 001. Matches the admin list ordering (which is
      // updatedAt desc, so display = total - index in the list).
      const folioTotal = await collection.countDocuments({});
      const olderCount = await collection.countDocuments({
        updatedAt: { $lt: doc.updatedAt },
      });
      const folio = olderCount + 1;
      const parsed = BlogPostSchema.safeParse({
        ...toClient(doc),
        content,
        tags: doc.tags ?? [],
        folio,
        folioTotal,
      });
      if (!parsed.success) {
        return NextResponse.json(
          { error: "stored_data_invalid", issues: parsed.error.issues },
          { status: 500, headers: NO_STORE },
        );
      }
      return NextResponse.json(parsed.data, {
        status: 200,
        headers: NO_STORE,
      });
    }

    const docs = await collection.find({}).sort({ updatedAt: -1 }).toArray();
    const folioTotal = docs.length;
    const posts = docs.map((doc, idx) =>
      AdminBlogListItemSchema.parse({
        ...toClient(doc),
        folio: folioTotal - idx,
        folioTotal,
      }),
    );
    return NextResponse.json({ posts }, { status: 200, headers: NO_STORE });
  } catch (err) {
    return errorResponse(err);
  }
});

type ActionBody =
  | { action: "create"; payload?: unknown }
  | { action: "update"; slug?: unknown; payload?: unknown }
  | { action: "set-status"; slug?: unknown; status?: unknown };

export const POST = withAdmin(async (_session, req: Request): Promise<Response> => {
  try {
    let body: ActionBody;
    try {
      body = ((await req.json()) ?? {}) as ActionBody;
    } catch {
      body = {} as ActionBody;
    }

    const collection = await getBlogPostsCollection();
    const now = new Date().toISOString();

    if (body.action === "create") {
      const input = BlogCreateInputSchema.safeParse(body.payload);
      if (!input.success) {
        return NextResponse.json(
          { error: "validation_failed", issues: input.error.issues },
          { status: 400, headers: NO_STORE },
        );
      }
      const existing = await collection.findOne(
        { _id: input.data.slug },
        { projection: { _id: 1 } },
      );
      if (existing) {
        return NextResponse.json(
          { error: "slug_taken" },
          { status: 409, headers: NO_STORE },
        );
      }
      const key = blogContentKey(input.data.slug);
      await putObject(key, input.data.content, "text/markdown; charset=utf-8");
      const tags = normalizeTags(input.data.tags);
      const coverImage =
        input.data.coverImage && input.data.coverImage.length > 0
          ? input.data.coverImage
          : undefined;
      const { readingMinutes, html } = await renderPost(input.data.content);
      const doc: BlogPostDoc = {
        _id: input.data.slug,
        title: input.data.title,
        excerpt: input.data.excerpt ?? "",
        s3ContentKey: key,
        status: "draft",
        createdAt: now,
        updatedAt: now,
        tags,
        ...(coverImage ? { coverImage } : {}),
        readingMinutes,
      };
      await collection.insertOne(doc);
      const folio = await folioFor(collection, doc);
      return NextResponse.json(
        BlogPostSchema.parse({
          ...toClient(doc),
          content: input.data.content,
          html,
          ...folio,
        }),
        { status: 201, headers: NO_STORE },
      );
    }

    if (body.action === "update") {
      const slug = ensureSlug(body.slug);
      if (!slug) {
        return NextResponse.json(
          { error: "invalid_slug" },
          { status: 400, headers: NO_STORE },
        );
      }
      const input = BlogUpdateInputSchema.safeParse(body.payload);
      if (!input.success) {
        return NextResponse.json(
          { error: "validation_failed", issues: input.error.issues },
          { status: 400, headers: NO_STORE },
        );
      }
      const existing = await collection.findOne({ _id: slug });
      if (!existing) {
        return NextResponse.json(
          { error: "not_found" },
          { status: 404, headers: NO_STORE },
        );
      }

      const update: Partial<BlogPostDoc> = { updatedAt: now };
      const unset: Record<string, ""> = {};
      if (input.data.title !== undefined) update.title = input.data.title;
      if (input.data.excerpt !== undefined) update.excerpt = input.data.excerpt;
      if (input.data.tags !== undefined) {
        update.tags = normalizeTags(input.data.tags);
      }
      if (input.data.coverImage !== undefined) {
        if (input.data.coverImage.length > 0) {
          update.coverImage = input.data.coverImage;
        } else {
          unset.coverImage = "";
        }
      }
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

      // Recompute reading time + HTML whenever the body changed; otherwise
      // recompute HTML for the response but leave persisted readingMinutes alone.
      const { readingMinutes, html } = await renderPost(content);
      if (input.data.content !== undefined) {
        update.readingMinutes = readingMinutes;
      }

      const mongoUpdate: Record<string, unknown> = { $set: update };
      if (Object.keys(unset).length > 0) mongoUpdate.$unset = unset;

      const result = await collection.findOneAndUpdate(
        { _id: slug },
        mongoUpdate,
        { returnDocument: "after" },
      );
      if (!result) {
        return NextResponse.json(
          { error: "not_found" },
          { status: 404, headers: NO_STORE },
        );
      }
      const folio = await folioFor(collection, result);
      return NextResponse.json(
        BlogPostSchema.parse({
          ...toClient(result),
          content,
          html,
          tags: result.tags ?? [],
          ...folio,
        }),
        { status: 200, headers: NO_STORE },
      );
    }

    if (body.action === "set-status") {
      const slug = ensureSlug(body.slug);
      if (!slug) {
        return NextResponse.json(
          { error: "invalid_slug" },
          { status: 400, headers: NO_STORE },
        );
      }
      const status = body.status;
      if (typeof status !== "string" || !isStatus(status)) {
        return NextResponse.json(
          { error: "invalid_status" },
          { status: 400, headers: NO_STORE },
        );
      }
      const existing = await collection.findOne({ _id: slug });
      if (!existing) {
        return NextResponse.json(
          { error: "not_found" },
          { status: 404, headers: NO_STORE },
        );
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
        return NextResponse.json(
          { error: "not_found" },
          { status: 404, headers: NO_STORE },
        );
      }
      const content =
        (await getObjectAsString(
          result.s3ContentKey ?? blogContentKey(slug),
        )) ?? "";
      const folio = await folioFor(collection, result);
      return NextResponse.json(
        BlogPostSchema.parse({
          ...toClient(result),
          content,
          tags: result.tags ?? [],
          ...folio,
        }),
        { status: 200, headers: NO_STORE },
      );
    }

    return NextResponse.json(
      { error: "unknown_action" },
      { status: 400, headers: NO_STORE },
    );
  } catch (err) {
    return errorResponse(err);
  }
});
