import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { ZodType } from "zod";
import { getContentCollection } from "../_lib/mongo.js";
import { requireAdmin } from "../_lib/session.js";
import {
  AboutContentSchema,
  ContactContentSchema,
  CoverContentSchema,
  WorkContentSchema,
  isContentDocId,
  type ContentDocId,
} from "../../src/shared/data/schemas.js";

const SCHEMAS: Record<ContentDocId, ZodType> = {
  cover: CoverContentSchema,
  about: AboutContentSchema,
  work: WorkContentSchema,
  contact: ContactContentSchema,
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const session = await requireAdmin(req, res);
  if (!session) return;

  const body = (req.body ?? {}) as { docId?: unknown; data?: unknown };
  if (!isContentDocId(body.docId)) {
    return res.status(400).json({ error: "unknown_doc_id" });
  }

  const result = SCHEMAS[body.docId].safeParse(body.data);
  if (!result.success) {
    return res
      .status(400)
      .json({ error: "validation_failed", issues: result.error.issues });
  }

  const collection = await getContentCollection();
  const update = await collection.updateOne(
    { _id: body.docId },
    { $set: result.data as Record<string, unknown> },
  );
  if (update.matchedCount === 0) {
    return res.status(404).json({ error: "doc_not_seeded" });
  }

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ ok: true });
}
