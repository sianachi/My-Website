import type { ZodType } from "zod";
import { getContentCollection, type ContentId } from "./lib/mongo";
import {
  AboutContentSchema,
  ContactContentSchema,
  CoverContentSchema,
  WorkContentSchema,
  type AboutContent,
  type ContactContent,
  type CoverContent,
  type WorkContent,
} from "@/shared/data/schemas";

export type SiteContent = {
  cover: CoverContent;
  about: AboutContent;
  work: WorkContent;
  contact: ContactContent;
};

const SCHEMAS: Record<ContentId, ZodType> = {
  cover: CoverContentSchema,
  about: AboutContentSchema,
  work: WorkContentSchema,
  contact: ContactContentSchema,
};

/** Read one content section straight from Mongo, schema-validated. */
export async function getContent<T>(
  id: ContentId,
  schema: ZodType<T>,
): Promise<T | null> {
  const collection = await getContentCollection();
  const doc = await collection.findOne({ _id: id }, { projection: { _id: 0 } });
  if (!doc) return null;
  return schema.parse(doc);
}

/**
 * Fetch all four content sections in one query — used by the home page server
 * component so the homepage renders fully on the server (no client fetch).
 * Throws if any section is unseeded so the caller can surface an error page.
 */
export async function getSiteContent(): Promise<SiteContent> {
  const collection = await getContentCollection();
  const docs = await collection
    .find({ _id: { $in: ["cover", "about", "work", "contact"] } })
    .toArray();
  const byId = new Map(docs.map((d) => [d._id, d]));

  function parse<T>(id: ContentId): T {
    const doc = byId.get(id);
    if (!doc) throw new Error(`Content not seeded: ${id}`);
    const { _id: _drop, ...rest } = doc;
    return SCHEMAS[id].parse(rest) as T;
  }

  return {
    cover: parse<CoverContent>("cover"),
    about: parse<AboutContent>("about"),
    work: parse<WorkContent>("work"),
    contact: parse<ContactContent>("contact"),
  };
}
