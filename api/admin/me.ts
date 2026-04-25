import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminCollection } from "../_lib/mongo.js";
import { requireAdmin } from "../_lib/session.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const session = await requireAdmin(req, res);
  if (!session) return;

  const admin = await getAdminCollection();
  const doc = await admin.findOne({ _id: "admin" });

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    authenticated: true,
    credentialCount: doc?.credentials.length ?? 0,
    expiresAt: session.expiresAt.toISOString(),
  });
}
