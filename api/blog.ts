import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getBlogPostsCollection, type BlogPostDoc } from "./_lib/mongo.js";
import {
  BlogPostListItemSchema,
  BlogPostSchema,
} from "../src/shared/data/blog.js";

const CACHE_HEADER = "public, s-maxage=3600, stale-while-revalidate=86400";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const slugParam = readQuery(req.query.slug);
  const collection = await getBlogPostsCollection();

  if (slugParam) {
    const doc = await collection.findOne({
      _id: slugParam,
      status: "published",
    });
    if (!doc) {
      return res.status(404).json({ message: "Not Found" });
    }
    const post = BlogPostSchema.parse(toClient(doc));
    res.setHeader("Cache-Control", CACHE_HEADER);
    return res.status(200).json(post);
  }

  const docs = await collection
    .find({ status: "published" }, { projection: { content: 0 } })
    .sort({ publishedAt: -1 })
    .toArray();
  const posts = docs.map((doc) =>
    BlogPostListItemSchema.parse(toClient(doc)),
  );
  res.setHeader("Cache-Control", CACHE_HEADER);
  return res.status(200).json({ posts });
}

function readQuery(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  return null;
}

function toClient(doc: Partial<BlogPostDoc> & { _id: string }) {
  const { _id, ...rest } = doc;
  return { slug: _id, ...rest };
}
