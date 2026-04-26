import { Router } from "express";
import { getBlogPostsCollection, type BlogPostDoc } from "../lib/mongo.js";
import { getObjectAsString } from "../lib/s3.js";
import {
  BlogPostListItemSchema,
  BlogPostSchema,
  blogContentKey,
} from "../../src/shared/data/blog.js";

const CACHE_HEADER = "public, s-maxage=3600, stale-while-revalidate=86400";

export const blogRouter = Router();

blogRouter.get("/", async (req, res) => {
  const slugParam = readQuery(req.query.slug);
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
    const post = BlogPostSchema.parse({ ...toClient(doc), content });
    res.setHeader("Cache-Control", CACHE_HEADER);
    res.status(200).json(post);
    return;
  }

  const docs = await collection
    .find({ status: "published" })
    .sort({ publishedAt: -1 })
    .toArray();
  const posts = docs.map((doc) => BlogPostListItemSchema.parse(toClient(doc)));
  res.setHeader("Cache-Control", CACHE_HEADER);
  res.status(200).json({ posts });
});

function readQuery(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  return null;
}

function toClient(doc: Partial<BlogPostDoc> & { _id: string }) {
  const { _id, s3ContentKey: _key, ...rest } = doc;
  return { slug: _id, ...rest };
}
