import { getBlogPostsCollection, type BlogPostDoc } from "./lib/mongo";
import { getObjectAsString } from "./lib/s3";
import { renderPost } from "./lib/markdown";
import {
  BlogPostListItemSchema,
  BlogPostSchema,
  blogContentKey,
  type BlogPost,
  type BlogPostListItem,
} from "@/shared/data/blog";

function toClient(doc: Partial<BlogPostDoc> & { _id: string }) {
  const { _id, s3ContentKey: _key, ...rest } = doc;
  return { slug: _id, ...rest };
}

function listItem(
  doc: BlogPostDoc,
  folio = 0,
  folioTotal = 0,
): BlogPostListItem {
  return BlogPostListItemSchema.parse({ ...toClient(doc), folio, folioTotal });
}

function countShared(a: readonly string[], b: readonly string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const set = new Set(a);
  let n = 0;
  for (const t of b) if (set.has(t)) n += 1;
  return n;
}

/**
 * Published posts, newest first. `tag` (when given) must already be a valid
 * tag string — callers validate it against BlogTagSchema. Folio counts up
 * from the oldest post (1) to the newest (N).
 */
export async function getPublishedPosts(
  tag?: string,
): Promise<BlogPostListItem[]> {
  const collection = await getBlogPostsCollection();
  const filter: Record<string, unknown> = { status: "published" };
  if (tag) filter.tags = tag;
  const docs = await collection
    .find(filter)
    .sort({ publishedAt: -1 })
    .toArray();
  const folioTotal = docs.length;
  return docs.map((doc, idx) => listItem(doc, folioTotal - idx, folioTotal));
}

/** A single published post, body rendered to HTML. null when not found. */
export async function getPost(slug: string): Promise<BlogPost | null> {
  const collection = await getBlogPostsCollection();
  const doc = await collection.findOne({ _id: slug, status: "published" });
  if (!doc) return null;

  const content = await getObjectAsString(
    doc.s3ContentKey ?? blogContentKey(doc._id),
  );
  if (content === null) return null;

  const { html, readingMinutes } = await renderPost(content);
  // Folio = 1-based ordinal across the published list ordered by publishedAt
  // ascending — oldest = 001, newest = total.
  const folioTotal = await collection.countDocuments({ status: "published" });
  const olderCount = doc.publishedAt
    ? await collection.countDocuments({
        status: "published",
        publishedAt: { $lt: doc.publishedAt },
      })
    : 0;
  return BlogPostSchema.parse({
    ...toClient(doc),
    content,
    html,
    readingMinutes: doc.readingMinutes ?? readingMinutes,
    folio: olderCount + 1,
    folioTotal,
  });
}

/** Bare published-post metadata for sitemap/feed/SEO. */
export async function getPublishedPostDocs(): Promise<BlogPostDoc[]> {
  const collection = await getBlogPostsCollection();
  return collection.find({ status: "published" }).sort({ publishedAt: -1 }).toArray();
}

export type BlogNeighbors = {
  prev: BlogPostListItem | null;
  next: BlogPostListItem | null;
};

/** Previous/next published posts by date. null when `slug` isn't published. */
export async function getNeighbors(
  slug: string,
): Promise<BlogNeighbors | null> {
  const collection = await getBlogPostsCollection();
  const current = await collection.findOne({ _id: slug, status: "published" });
  if (!current || !current.publishedAt) return null;
  const [newer, older] = await Promise.all([
    collection
      .find({ status: "published", publishedAt: { $gt: current.publishedAt } })
      .sort({ publishedAt: 1 })
      .limit(1)
      .toArray(),
    collection
      .find({ status: "published", publishedAt: { $lt: current.publishedAt } })
      .sort({ publishedAt: -1 })
      .limit(1)
      .toArray(),
  ]);
  return {
    next: newer[0] ? listItem(newer[0]) : null,
    prev: older[0] ? listItem(older[0]) : null,
  };
}

/** Up to 3 posts ranked by shared-tag overlap then recency. null if missing. */
export async function getRelated(
  slug: string,
): Promise<BlogPostListItem[] | null> {
  const collection = await getBlogPostsCollection();
  const current = await collection.findOne({ _id: slug, status: "published" });
  if (!current) return null;
  const tags = current.tags ?? [];
  const others = await collection
    .find({ _id: { $ne: slug }, status: "published" })
    .sort({ publishedAt: -1 })
    .toArray();
  return others
    .map((doc) => ({ doc, shared: countShared(doc.tags ?? [], tags) }))
    .sort((a, b) => {
      if (b.shared !== a.shared) return b.shared - a.shared;
      const ap = a.doc.publishedAt ?? "";
      const bp = b.doc.publishedAt ?? "";
      return ap < bp ? 1 : ap > bp ? -1 : 0;
    })
    .slice(0, 3)
    .map((r) => listItem(r.doc));
}
