import { NextResponse } from "next/server";
import { getContentCollection } from "@/server/lib/mongo";
import { errorResponse, withAdmin } from "@/server/lib/route-helpers";
import { isContentDocId, type ContentDocId } from "@/shared/data/schemas";
import { ABOUT } from "@/shared/data/about";
import { CONTACT } from "@/shared/data/contact";
import { COVER } from "@/shared/data/cover";
import { WORK } from "@/shared/data/work";

export const dynamic = "force-dynamic";

const DEFAULTS: Record<ContentDocId, unknown> = {
  cover: COVER,
  about: ABOUT,
  work: WORK,
  contact: CONTACT,
};

export const POST = withAdmin(async (_session, req: Request): Promise<Response> => {
  try {
    let body: { docId?: unknown };
    try {
      body = ((await req.json()) ?? {}) as { docId?: unknown };
    } catch {
      body = {};
    }

    if (!isContentDocId(body.docId)) {
      return NextResponse.json(
        { error: "unknown_doc_id" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const data = DEFAULTS[body.docId];
    const collection = await getContentCollection();
    await collection.replaceOne(
      { _id: body.docId },
      { _id: body.docId, ...(data as Record<string, unknown>) },
      { upsert: true },
    );

    return NextResponse.json(
      { ok: true, data },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return errorResponse(err);
  }
});
