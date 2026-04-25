import { randomBytes } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { SessionDoc } from "../../src/shared/data/schemas.js";
import { getSessionCollection } from "./mongo.js";
import { isSecureOrigin } from "./webauthn.js";

export const SESSION_COOKIE = "core_session";
export const CHALLENGE_COOKIE = "core_challenge";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const CHALLENGE_TTL_SECONDS = 60 * 5; // 5 minutes

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function parseCookies(
  header: string | string[] | undefined,
): Record<string, string> {
  const raw = Array.isArray(header) ? header.join("; ") : (header ?? "");
  if (!raw) return {};
  const out: Record<string, string> = {};
  for (const part of raw.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (!k) continue;
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}

type CookieOpts = {
  maxAgeSeconds: number;
  path?: string;
  httpOnly?: boolean;
  sameSite?: "Lax" | "Strict" | "None";
};

export function buildSetCookie(
  name: string,
  value: string,
  opts: CookieOpts,
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${opts.path ?? "/"}`);
  parts.push(`Max-Age=${opts.maxAgeSeconds}`);
  parts.push(`SameSite=${opts.sameSite ?? "Lax"}`);
  if (opts.httpOnly !== false) parts.push("HttpOnly");
  if (isSecureOrigin()) parts.push("Secure");
  return parts.join("; ");
}

function appendSetCookie(res: VercelResponse, cookie: string): void {
  const existing = res.getHeader("Set-Cookie");
  if (!existing) {
    res.setHeader("Set-Cookie", cookie);
  } else if (Array.isArray(existing)) {
    res.setHeader("Set-Cookie", [...existing, cookie]);
  } else {
    res.setHeader("Set-Cookie", [String(existing), cookie]);
  }
}

export function setSessionCookie(
  res: VercelResponse,
  value: string,
  maxAgeSeconds = SESSION_TTL_SECONDS,
): void {
  appendSetCookie(
    res,
    buildSetCookie(SESSION_COOKIE, value, { maxAgeSeconds }),
  );
}

export function clearSessionCookie(res: VercelResponse): void {
  appendSetCookie(res, buildSetCookie(SESSION_COOKIE, "", { maxAgeSeconds: 0 }));
}

export function setChallengeCookie(res: VercelResponse, value: string): void {
  appendSetCookie(
    res,
    buildSetCookie(CHALLENGE_COOKIE, value, {
      maxAgeSeconds: CHALLENGE_TTL_SECONDS,
    }),
  );
}

export function clearChallengeCookie(res: VercelResponse): void {
  appendSetCookie(
    res,
    buildSetCookie(CHALLENGE_COOKIE, "", { maxAgeSeconds: 0 }),
  );
}

export function getCookies(req: VercelRequest): Record<string, string> {
  return parseCookies(req.headers.cookie);
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

export async function readSession(
  req: VercelRequest,
): Promise<SessionDoc | null> {
  const cookies = getCookies(req);
  const id = cookies[SESSION_COOKIE];
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

export async function requireAdmin(
  req: VercelRequest,
  res: VercelResponse,
): Promise<SessionDoc | null> {
  const session = await readSession(req);
  if (!session) {
    res.status(401).json({ message: "Unauthorized" });
    return null;
  }
  return session;
}
