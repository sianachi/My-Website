import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  SESSION_COOKIE,
  clearSessionCookie,
  destroySession,
  getCookies,
} from "../_lib/session.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const id = getCookies(req)[SESSION_COOKIE];
  if (id) await destroySession(id);
  clearSessionCookie(res);

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ ok: true });
}
