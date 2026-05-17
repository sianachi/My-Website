import { NextResponse } from "next/server";
import { objectExists, publicUrl } from "@/server/lib/s3";

// Hits S3 per request — never prerendered at build time.
export const dynamic = "force-dynamic";


const CV_KEY = "cv/current.pdf";

export async function GET(): Promise<Response> {
  try {
    const exists = await objectExists(CV_KEY);
    if (!exists) {
      return NextResponse.json(
        { message: "CV not uploaded yet" },
        { status: 404 },
      );
    }
    const res = NextResponse.redirect(publicUrl(CV_KEY), 302);
    res.headers.set(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300",
    );
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
