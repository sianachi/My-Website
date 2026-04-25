import type { VercelRequest, VercelResponse } from "@vercel/node";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import {
  getAdminCollection,
  getChallengeCollection,
} from "../../_lib/mongo.js";
import {
  randomToken,
  setChallengeCookie,
} from "../../_lib/session.js";
import { getRpConfig } from "../../_lib/webauthn.js";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const admin = await getAdminCollection();
  const adminDoc = await admin.findOne({ _id: "admin" });
  if (!adminDoc) {
    return res.status(404).json({ error: "no_admin" });
  }

  const { rpID } = getRpConfig();
  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: adminDoc.credentials.map((c) => ({
      id: c.id,
      transports: c.transports,
    })),
    userVerification: "preferred",
  });

  const token = randomToken();
  const challenges = await getChallengeCollection();
  await challenges.insertOne({
    _id: token,
    kind: "login",
    challenge: options.challenge,
    expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
  });
  setChallengeCookie(res, token);

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json(options);
}
