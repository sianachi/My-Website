import { NextResponse } from "next/server";
import { presignPutUrl, publicUrl } from "@/server/lib/s3";
import { errorResponse, withAdmin } from "@/server/lib/route-helpers";
import {
  BlogSlugSchema,
  isSafeBlogFilename,
  BLOG_BODY_FILENAME,
} from "@/shared/data/blog";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const UPLOAD_MAX_BYTES = 32 * 1024 * 1024;

/**
 * Parse a path like `blog/<slug>/<filename>` and verify both segments are
 * safe. Returns null on any violation (bad slug, body filename, traversal,
 * subfolder). The body file (`post.md`) is editor-managed and rejected here.
 */
function parseBlogAssetPath(
  pathname: string,
): { slug: string; filename: string } | null {
  if (typeof pathname !== "string") return null;
  if (!pathname.startsWith("blog/")) return null;
  if (pathname.includes("..")) return null;
  const rest = pathname.slice("blog/".length);
  const slash = rest.indexOf("/");
  if (slash < 1) return null;
  const slug = rest.slice(0, slash);
  const filename = rest.slice(slash + 1);
  if (!BlogSlugSchema.safeParse(slug).success) return null;
  if (!isSafeBlogFilename(filename)) return null;
  return { slug, filename };
}

export const POST = withAdmin(async (_session, req: Request): Promise<Response> => {
  try {
    let body: {
      pathname?: unknown;
      contentType?: unknown;
      contentLength?: unknown;
    };
    try {
      body = ((await req.json()) ?? {}) as typeof body;
    } catch {
      body = {};
    }

    const pathname = typeof body.pathname === "string" ? body.pathname : "";
    const contentType =
      typeof body.contentType === "string" ? body.contentType : "";
    const parsed = parseBlogAssetPath(pathname);
    if (!parsed) {
      return NextResponse.json(
        {
          error: `pathname must be blog/<slug>/<filename>; '${BLOG_BODY_FILENAME}' is reserved`,
        },
        { status: 400, headers: NO_STORE },
      );
    }
    if (contentType.length === 0) {
      return NextResponse.json(
        { error: "contentType is required" },
        { status: 400, headers: NO_STORE },
      );
    }
    if (
      typeof body.contentLength !== "number" ||
      !Number.isFinite(body.contentLength) ||
      body.contentLength <= 0 ||
      body.contentLength > UPLOAD_MAX_BYTES
    ) {
      return NextResponse.json(
        { error: `contentLength must be 1..${UPLOAD_MAX_BYTES} bytes` },
        { status: 400, headers: NO_STORE },
      );
    }

    try {
      const uploadUrl = await presignPutUrl(pathname, contentType, 60);
      return NextResponse.json(
        {
          uploadUrl,
          publicUrl: publicUrl(pathname),
          key: pathname,
        },
        { status: 200, headers: NO_STORE },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { error: message },
        { status: 500, headers: NO_STORE },
      );
    }
  } catch (err) {
    return errorResponse(err);
  }
});
