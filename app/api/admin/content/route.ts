import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { getContentCollection } from "@/server/lib/mongo";
import { errorResponse, withAdmin } from "@/server/lib/route-helpers";
import {
  AboutContentSchema,
  ContactContentSchema,
  CoverContentSchema,
  WorkContentSchema,
  isContentDocId,
  type ContentDocId,
} from "@/shared/data/schemas";

export const dynamic = "force-dynamic";

const SCHEMAS: Record<ContentDocId, ZodType> = {
  cover: CoverContentSchema,
  about: AboutContentSchema,
  work: WorkContentSchema,
  contact: ContactContentSchema,
};

export const POST = withAdmin(async (_session, req: Request): Promise<Response> => {
  try {
    let body: { docId?: unknown; data?: unknown };
    try {
      body = ((await req.json()) ?? {}) as { docId?: unknown; data?: unknown };
    } catch {
      body = {};
    }

    if (!isContentDocId(body.docId)) {
      return NextResponse.json(
        { error: "unknown_doc_id" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const result = SCHEMAS[body.docId].safeParse(body.data);
    if (!result.success) {
      return NextResponse.json(
        { error: "validation_failed", issues: result.error.issues },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const collection = await getContentCollection();
    const update = await collection.updateOne(
      { _id: body.docId },
      { $set: result.data as Record<string, unknown> },
    );
    if (update.matchedCount === 0) {
      return NextResponse.json(
        { error: "doc_not_seeded" },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { ok: true },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return errorResponse(err);
  }
});
