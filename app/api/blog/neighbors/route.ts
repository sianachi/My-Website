import { NextResponse } from "next/server";
import { getNeighbors } from "@/server/blog";
import { errorResponse } from "@/server/lib/route-helpers";

const CACHE_HEADER = "public, s-maxage=3600, stale-while-revalidate=86400";

// Reads from MongoDB per request — never prerendered at build time.
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  try {
    const slug = new URL(req.url).searchParams.get("slug");
    if (!slug) {
      return NextResponse.json(
        { error: "slug is required" },
        { status: 400 },
      );
    }
    const neighbors = await getNeighbors(slug);
    if (!neighbors) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json(
      { next: neighbors.next, prev: neighbors.prev },
      { status: 200, headers: { "Cache-Control": CACHE_HEADER } },
    );
  } catch (err) {
    return errorResponse(err);
  }
}
