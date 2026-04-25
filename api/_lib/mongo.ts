import { MongoClient, type Collection, type Db } from "mongodb";

let clientPromise: Promise<MongoClient> | null = null;

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

export type ContentId = "cover" | "about" | "work" | "contact";

export type ContentDoc = { _id: ContentId } & Record<string, unknown>;

export async function getContentCollection(): Promise<Collection<ContentDoc>> {
  const db = await getDb();
  return db.collection<ContentDoc>("content");
}
