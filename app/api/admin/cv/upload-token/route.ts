import { NextResponse } from "next/server";
import { presignPutUrl, publicUrl } from "@/server/lib/s3";
import { errorResponse, withAdmin } from "@/server/lib/route-helpers";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const CV_KEY = "cv/current.pdf";
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPE = "application/pdf";

export const POST = withAdmin(async (_session, req: Request): Promise<Response> => {
  try {
    let body: { contentType?: unknown; contentLength?: unknown };
    try {
      body = ((await req.json()) ?? {}) as {
        contentType?: unknown;
        contentLength?: unknown;
      };
    } catch {
      body = {};
    }

    if (body.contentType !== ALLOWED_TYPE) {
      return NextResponse.json(
        { error: `contentType must be ${ALLOWED_TYPE}` },
        { status: 400, headers: NO_STORE },
      );
    }
    if (
      typeof body.contentLength !== "number" ||
      !Number.isFinite(body.contentLength) ||
      body.contentLength <= 0 ||
      body.contentLength > MAX_BYTES
    ) {
      return NextResponse.json(
        { error: `contentLength must be 1..${MAX_BYTES} bytes` },
        { status: 400, headers: NO_STORE },
      );
    }

    try {
      const uploadUrl = await presignPutUrl(CV_KEY, ALLOWED_TYPE, 60);
      return NextResponse.json(
        {
          uploadUrl,
          publicUrl: publicUrl(CV_KEY),
          key: CV_KEY,
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
