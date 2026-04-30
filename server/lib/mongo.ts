import { MongoClient, type Collection, type Db } from "mongodb";
import type {
  AdminDoc,
  ChallengeDoc,
  SessionDoc,
} from "../../src/shared/data/schemas.js";
import type { BlogPost } from "../../src/shared/data/blog.js";

let clientPromise: Promise<MongoClient> | null = null;
let indexesEnsured = false;

function getDb(): Promise<Db> {
  if (!clientPromise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI is not set");
    }
    clientPromise = new MongoClient(uri).connect();
  }
  return clientPromise.then((c) => c.db());
}

async function ensureAuthIndexes(db: Db): Promise<void> {
  if (indexesEnsured) return;
  await Promise.all([
    db
      .collection("auth_challenges")
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db
      .collection("auth_sessions")
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);
  indexesEnsured = true;
}

export type ContentId = "cover" | "about" | "work" | "contact";

export type ContentDoc = { _id: ContentId } & Record<string, unknown>;

export async function getContentCollection(): Promise<Collection<ContentDoc>> {
  const db = await getDb();
  return db.collection<ContentDoc>("content");
}

export async function getAdminCollection(): Promise<Collection<AdminDoc>> {
  const db = await getDb();
  await ensureAuthIndexes(db);
  return db.collection<AdminDoc>("admin");
}

export async function getChallengeCollection(): Promise<
  Collection<ChallengeDoc>
> {
  const db = await getDb();
  await ensureAuthIndexes(db);
  return db.collection<ChallengeDoc>("auth_challenges");
}

export async function getSessionCollection(): Promise<Collection<SessionDoc>> {
  const db = await getDb();
  await ensureAuthIndexes(db);
  return db.collection<SessionDoc>("auth_sessions");
}

/**
 * Mongo doc holds metadata only. The post body is markdown stored in S3 at
 * `blogContentKey(slug)` — see src/shared/data/blog.ts. `html` is derived
 * on read; `readingMinutes` is computed once per save.
 */
export type BlogPostDoc = Omit<BlogPost, "slug" | "content" | "html"> & {
  _id: string;
  s3ContentKey: string;
};

export async function getBlogPostsCollection(): Promise<
  Collection<BlogPostDoc>
> {
  const db = await getDb();
  return db.collection<BlogPostDoc>("blog_posts");
}
