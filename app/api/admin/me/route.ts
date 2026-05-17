import { NextResponse } from "next/server";
import { getAdminCollection } from "@/server/lib/mongo";
import { errorResponse, withAdmin } from "@/server/lib/route-helpers";

export const dynamic = "force-dynamic";

export const GET = withAdmin(async (session): Promise<Response> => {
  try {
    const admin = await getAdminCollection();
    const doc = await admin.findOne({ _id: "admin" });

    return NextResponse.json(
      {
        authenticated: true,
        credentialCount: doc?.credentials.length ?? 0,
        expiresAt: session.expiresAt.toISOString(),
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return errorResponse(err);
  }
});
