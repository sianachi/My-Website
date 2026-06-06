import { NextResponse } from "next/server";
import {
  clearSessionCookie,
  destroySession,
  readCookie,
  SESSION_COOKIE,
} from "@/server/lib/session";
import { errorResponse } from "@/server/lib/route-helpers";

export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  try {
    const id = await readCookie(SESSION_COOKIE);
    if (id) await destroySession(id);
    await clearSessionCookie();

    return NextResponse.json(
      { ok: true },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return errorResponse(err);
  }
}
