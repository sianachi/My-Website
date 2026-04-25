import { Router, type RequestHandler } from "express";
import type { ZodType } from "zod";
import { getContentCollection, type ContentId } from "../lib/mongo.js";
import {
  AboutContentSchema,
  ContactContentSchema,
  CoverContentSchema,
  WorkContentSchema,
} from "../../src/shared/data/schemas.js";

const CACHE_HEADER = "public, s-maxage=3600, stale-while-revalidate=86400";

function readContent(id: ContentId, schema: ZodType): RequestHandler {
  return async (_req, res) => {
    const collection = await getContentCollection();
    const doc = await collection.findOne(
      { _id: id },
      { projection: { _id: 0 } },
    );
    if (!doc) {
      res.status(503).json({ message: "Content not seeded" });
      return;
    }
    const content = schema.parse(doc);
    res.setHeader("Cache-Control", CACHE_HEADER);
    res.status(200).json(content);
  };
}

export const contentRouter = Router();
contentRouter.get("/cover", readContent("cover", CoverContentSchema));
contentRouter.get("/about", readContent("about", AboutContentSchema));
contentRouter.get("/work", readContent("work", WorkContentSchema));
contentRouter.get("/contact", readContent("contact", ContactContentSchema));
