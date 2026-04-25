import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminCollection } from "../_lib/mongo.js";
import { readSession } from "../_lib/session.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const admin = await getAdminCollection();
  const adminDoc = await admin.findOne({ _id: "admin" });
  const session = await readSession(req);

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    hasAdmin: !!adminDoc,
    authenticated: !!session,
  });
}
