import { NextResponse } from "next/server";
import { getAdminCollection } from "@/server/lib/mongo";
import { readSession } from "@/server/lib/session";
import { errorResponse } from "@/server/lib/route-helpers";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const admin = await getAdminCollection();
    const adminDoc = await admin.findOne({ _id: "admin" });
    const session = await readSession();

    return NextResponse.json(
      {
        hasAdmin: !!adminDoc,
        authenticated: !!session,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return errorResponse(err);
  }
}
