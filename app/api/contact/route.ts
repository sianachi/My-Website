import { NextResponse } from "next/server";
import { getContent } from "@/server/content";
import { errorResponse } from "@/server/lib/route-helpers";
import { ContactContentSchema } from "@/shared/data/schemas";

const CACHE_HEADER = "public, s-maxage=3600, stale-while-revalidate=86400";

// Reads from MongoDB per request — never prerendered at build time.
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const content = await getContent("contact", ContactContentSchema);
    if (!content) {
      return NextResponse.json(
        { message: "Content not seeded" },
        { status: 503 },
      );
    }
    return NextResponse.json(content, {
      status: 200,
      headers: { "Cache-Control": CACHE_HEADER },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
