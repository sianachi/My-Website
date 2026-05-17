import { NextResponse } from "next/server";
import { getBlogPostsCollection } from "@/server/lib/mongo";
import { listObjects, publicUrl } from "@/server/lib/s3";
import { errorResponse, withAdmin } from "@/server/lib/route-helpers";
import {
  BlogSlugSchema,
  blogPrefix,
  BLOG_BODY_FILENAME,
} from "@/shared/data/blog";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

function readQuery(value: string | null): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  return null;
}

export const GET = withAdmin(async (_session, req: Request): Promise<Response> => {
  try {
    const slug = readQuery(new URL(req.url).searchParams.get("slug"));
    if (!slug || !BlogSlugSchema.safeParse(slug).success) {
      return NextResponse.json(
        { error: "invalid_slug" },
        { status: 400, headers: NO_STORE },
      );
    }

    // Confirm the post exists before exposing folder contents.
    const collection = await getBlogPostsCollection();
    const exists = await collection.findOne(
      { _id: slug },
      { projection: { _id: 1 } },
    );
    if (!exists) {
      return NextResponse.json(
        { error: "not_found" },
        { status: 404, headers: NO_STORE },
      );
    }

    const prefix = blogPrefix(slug);
    const objects = await listObjects(prefix);
    const files = objects
      .map((obj) => {
        const filename = obj.key.slice(prefix.length);
        return {
          filename,
          key: obj.key,
          size: obj.size,
          lastModified: obj.lastModified,
          url: publicUrl(obj.key),
        };
      })
      .filter((f) => f.filename && f.filename !== BLOG_BODY_FILENAME)
      .sort((a, b) => {
        const at = a.lastModified ?? "";
        const bt = b.lastModified ?? "";
        return at < bt ? 1 : at > bt ? -1 : 0;
      });

    return NextResponse.json(
      { slug, files },
      { status: 200, headers: NO_STORE },
    );
  } catch (err) {
    return errorResponse(err);
  }
});
