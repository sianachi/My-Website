import { MongoClient } from "mongodb";
import { ABOUT } from "../src/shared/data/about.js";
import { CONTACT } from "../src/shared/data/contact.js";
import { COVER } from "../src/shared/data/cover.js";
import { WORK } from "../src/shared/data/work.js";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set");
  process.exit(1);
}

type ContentDoc = { _id: string } & Record<string, unknown>;

const docs: ContentDoc[] = [
  { _id: "cover", ...COVER },
  { _id: "about", ...ABOUT },
  { _id: "work", ...WORK },
  { _id: "contact", ...CONTACT },
];

const client = new MongoClient(uri);
await client.connect();
try {
  const collection = client.db().collection<ContentDoc>("content");
  for (const doc of docs) {
    await collection.replaceOne({ _id: doc._id }, doc, { upsert: true });
    console.log(`upserted ${doc._id}`);
  }
} finally {
  await client.close();
}
