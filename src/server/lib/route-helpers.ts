import { NextResponse } from "next/server";
import type { SessionDoc } from "@/shared/data/schemas";
import { requireAdmin } from "./session";

/**
 * Wrap an admin Route Handler so it only runs with a valid session. The
 * authoritative auth check is this per-handler DB lookup — never Edge
 * `middleware.ts`, which can't reach Mongo.
 */
export function withAdmin<A extends unknown[]>(
  handler: (session: SessionDoc, ...args: A) => Promise<Response> | Response,
): (...args: A) => Promise<Response> {
  return async (...args: A) => {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }
    return handler(session, ...args);
  };
}

/** Uniform 500 for unexpected Route Handler failures. */
export function errorResponse(err: unknown): NextResponse {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[api] ${message}`);
  return NextResponse.json(
    { error: message },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}
