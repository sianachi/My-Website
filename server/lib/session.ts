import { randomBytes } from "node:crypto";
import type { Request, Response } from "express";
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

type CookieOpts = {
  maxAgeSeconds: number;
  path?: string;
  httpOnly?: boolean;
  sameSite?: "lax" | "strict" | "none";
};

function setCookie(
  res: Response,
  name: string,
  value: string,
  opts: CookieOpts,
): void {
  res.cookie(name, value, {
    path: opts.path ?? "/",
    maxAge: opts.maxAgeSeconds * 1000,
    sameSite: opts.sameSite ?? "lax",
    httpOnly: opts.httpOnly !== false,
    secure: isSecureOrigin(),
  });
}

export function setSessionCookie(
  res: Response,
  value: string,
  maxAgeSeconds = SESSION_TTL_SECONDS,
): void {
  setCookie(res, SESSION_COOKIE, value, { maxAgeSeconds });
}

export function clearSessionCookie(res: Response): void {
  setCookie(res, SESSION_COOKIE, "", { maxAgeSeconds: 0 });
}

export function setChallengeCookie(res: Response, value: string): void {
  setCookie(res, CHALLENGE_COOKIE, value, {
    maxAgeSeconds: CHALLENGE_TTL_SECONDS,
  });
}

export function clearChallengeCookie(res: Response): void {
  setCookie(res, CHALLENGE_COOKIE, "", { maxAgeSeconds: 0 });
}

export function getCookies(req: Request): Record<string, string> {
  return (req.cookies ?? {}) as Record<string, string>;
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

export async function readSession(req: Request): Promise<SessionDoc | null> {
  const id = getCookies(req)[SESSION_COOKIE];
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
  req: Request,
  res: Response,
): Promise<SessionDoc | null> {
  const session = await readSession(req);
  if (!session) {
    res.status(401).json({ message: "Unauthorized" });
    return null;
  }
  return session;
}
