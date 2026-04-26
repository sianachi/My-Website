import { Router } from "express";
import type { ZodType } from "zod";
import { getContentCollection } from "../../lib/mongo.js";
import { requireAdmin } from "../../lib/session.js";
import {
  AboutContentSchema,
  ContactContentSchema,
  CoverContentSchema,
  WorkContentSchema,
  isContentDocId,
  type ContentDocId,
} from "../../../src/shared/data/schemas.js";

const SCHEMAS: Record<ContentDocId, ZodType> = {
  cover: CoverContentSchema,
  about: AboutContentSchema,
  work: WorkContentSchema,
  contact: ContactContentSchema,
};

export const adminContentRouter = Router();

adminContentRouter.post("/", async (req, res) => {
  const session = await requireAdmin(req, res);
  if (!session) return;

  const body = (req.body ?? {}) as { docId?: unknown; data?: unknown };
  if (!isContentDocId(body.docId)) {
    res.status(400).json({ error: "unknown_doc_id" });
    return;
  }

  const result = SCHEMAS[body.docId].safeParse(body.data);
  if (!result.success) {
    res
      .status(400)
      .json({ error: "validation_failed", issues: result.error.issues });
    return;
  }

  const collection = await getContentCollection();
  const update = await collection.updateOne(
    { _id: body.docId },
    { $set: result.data as Record<string, unknown> },
  );
  if (update.matchedCount === 0) {
    res.status(404).json({ error: "doc_not_seeded" });
    return;
  }

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ ok: true });
});
