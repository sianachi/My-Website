import type { VercelRequest, VercelResponse } from "@vercel/node";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import {
  getAdminCollection,
  getChallengeCollection,
} from "../../../_lib/mongo.js";
import {
  randomToken,
  requireAdmin,
  setChallengeCookie,
} from "../../../_lib/session.js";
import { getRpConfig } from "../../../_lib/webauthn.js";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  if (!(await requireAdmin(req, res))) return;

  const admin = await getAdminCollection();
  const adminDoc = await admin.findOne({ _id: "admin" });
  if (!adminDoc) {
    return res.status(404).json({ error: "no_admin" });
  }

  const { rpID, rpName } = getRpConfig();
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: "admin",
    userID: new TextEncoder().encode(adminDoc.userHandle),
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "preferred",
    },
    excludeCredentials: adminDoc.credentials.map((c) => ({
      id: c.id,
      transports: c.transports,
    })),
  });

  const token = randomToken();
  const challenges = await getChallengeCollection();
  await challenges.insertOne({
    _id: token,
    kind: "add-credential",
    challenge: options.challenge,
    expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
  });
  setChallengeCookie(res, token);

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json(options);
}
