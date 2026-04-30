/**
 * Backfill `tags: []` and `readingMinutes` on existing blog_posts docs.
 * Idempotent — only updates docs that are missing the field. Safe to re-run.
 *
 * Run:
 *   bun run scripts/migrate-blog-meta.ts
 */
import { MongoClient } from "mongodb";
import { renderPost } from "../server/lib/markdown.js";
import { getObjectAsString } from "../server/lib/s3.js";
import { blogContentKey } from "../src/shared/data/blog.js";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set");
  process.exit(1);
}

type Doc = {
  _id: string;
  s3ContentKey?: string;
  tags?: string[];
  readingMinutes?: number;
};

const client = new MongoClient(uri);
await client.connect();
try {
  const collection = client.db().collection<Doc>("blog_posts");
  const docs = await collection.find({}).toArray();
  console.log(`scanning ${docs.length} posts`);

  let touched = 0;
  for (const doc of docs) {
    const update: Record<string, unknown> = {};
    if (!Array.isArray(doc.tags)) update.tags = [];
    if (typeof doc.readingMinutes !== "number") {
      const key = doc.s3ContentKey ?? blogContentKey(doc._id);
      const md = await getObjectAsString(key);
      if (md !== null) {
        const { readingMinutes } = await renderPost(md);
        update.readingMinutes = readingMinutes;
      }
    }
    if (Object.keys(update).length === 0) continue;
    await collection.updateOne({ _id: doc._id }, { $set: update });
    console.log(`updated ${doc._id}: ${Object.keys(update).join(", ")}`);
    touched += 1;
  }
  console.log(`done — touched ${touched}/${docs.length}`);
} finally {
  await client.close();
}
