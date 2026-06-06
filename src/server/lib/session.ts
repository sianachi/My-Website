import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { SessionDoc } from "@/shared/data/schemas";
import { getSessionCollection } from "./mongo";
import { isSecureOrigin } from "./webauthn";

export const SESSION_COOKIE = "core_session";
export const CHALLENGE_COOKIE = "core_challenge";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const CHALLENGE_TTL_SECONDS = 60 * 5; // 5 minutes

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/**
 * Cookie writes go through Next's `cookies()` store. This may only be called
 * from a Route Handler or Server Action — never during a Server Component
 * render — which matches how the auth endpoints use it.
 */
async function setCookie(
  name: string,
  value: string,
  maxAgeSeconds: number,
): Promise<void> {
  const store = await cookies();
  store.set(name, value, {
    path: "/",
    maxAge: maxAgeSeconds,
    sameSite: "lax",
    httpOnly: true,
    secure: isSecureOrigin(),
  });
}

export async function setSessionCookie(
  value: string,
  maxAgeSeconds = SESSION_TTL_SECONDS,
): Promise<void> {
  await setCookie(SESSION_COOKIE, value, maxAgeSeconds);
}

export async function clearSessionCookie(): Promise<void> {
  await setCookie(SESSION_COOKIE, "", 0);
}

export async function setChallengeCookie(value: string): Promise<void> {
  await setCookie(CHALLENGE_COOKIE, value, CHALLENGE_TTL_SECONDS);
}

export async function clearChallengeCookie(): Promise<void> {
  await setCookie(CHALLENGE_COOKIE, "", 0);
}

export async function readCookie(name: string): Promise<string | null> {
  const store = await cookies();
  return store.get(name)?.value ?? null;
}

export async function createSession(): Promise<{
  id: string;
  expiresAt: Date;
}> {
  const id = randomToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);
  const sessions = await getSessionCollection();
  await sessions.insertOne({
    _id: id,
    subject: "admin",
    createdAt: now,
    expiresAt,
    authStrength: "passkey",
  });
  return { id, expiresAt };
}

export async function destroySession(id: string): Promise<void> {
  const sessions = await getSessionCollection();
  await sessions.deleteOne({ _id: id });
}

export async function readSession(): Promise<SessionDoc | null> {
  const id = await readCookie(SESSION_COOKIE);
  if (!id) return null;
  const sessions = await getSessionCollection();
  const session = await sessions.findOne({ _id: id });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await sessions.deleteOne({ _id: id });
    return null;
  }
  return session;
}

/**
 * Returns the active admin session, or null when unauthenticated. Route
 * Handlers must check the result themselves and return 401 — see
 * `src/server/lib/route-helpers.ts` `withAdmin`.
 */
export async function requireAdmin(): Promise<SessionDoc | null> {
  return readSession();
}
