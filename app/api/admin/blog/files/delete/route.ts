import { NextResponse } from "next/server";
import { getBlogPostsCollection } from "@/server/lib/mongo";
import { deleteObject } from "@/server/lib/s3";
import { errorResponse, withAdmin } from "@/server/lib/route-helpers";
import { BlogSlugSchema, blogPrefix, isSafeBlogFilename } from "@/shared/data/blog";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export const POST = withAdmin(async (_session, req: Request): Promise<Response> => {
  try {
    let body: { slug?: unknown; filename?: unknown };
    try {
      body = ((await req.json()) ?? {}) as { slug?: unknown; filename?: unknown };
    } catch {
      body = {};
    }

    if (
      typeof body.slug !== "string" ||
      !BlogSlugSchema.safeParse(body.slug).success
    ) {
      return NextResponse.json(
        { error: "invalid_slug" },
        { status: 400, headers: NO_STORE },
      );
    }
    if (
      typeof body.filename !== "string" ||
      !isSafeBlogFilename(body.filename)
    ) {
      return NextResponse.json(
        { error: "invalid_filename" },
        { status: 400, headers: NO_STORE },
      );
    }

    const collection = await getBlogPostsCollection();
    const exists = await collection.findOne(
      { _id: body.slug },
      { projection: { _id: 1 } },
    );
    if (!exists) {
      return NextResponse.json(
        { error: "not_found" },
        { status: 404, headers: NO_STORE },
      );
    }

    await deleteObject(`${blogPrefix(body.slug)}${body.filename}`);
    return NextResponse.json(
      { ok: true },
      { status: 200, headers: NO_STORE },
    );
  } catch (err) {
    return errorResponse(err);
  }
});
