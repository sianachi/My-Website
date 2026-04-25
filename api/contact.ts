import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getContentCollection } from "./_lib/mongo.js";
import { ContactContentSchema } from "../src/shared/data/schemas.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const collection = await getContentCollection();
  const doc = await collection.findOne(
    { _id: "contact" },
    { projection: { _id: 0 } },
  );

  if (!doc) {
    return res.status(503).json({ message: "Content not seeded" });
  }

  const content = ContactContentSchema.parse(doc);
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=3600, stale-while-revalidate=86400",
  );
  return res.status(200).json(content);
}
