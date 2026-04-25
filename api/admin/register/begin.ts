import type { VercelRequest, VercelResponse } from "@vercel/node";
import { generateRegistrationOptions } from "@simplewebauthn/server";
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
  if (await admin.findOne({ _id: "admin" })) {
    return res.status(409).json({ error: "admin_exists" });
  }

  const { rpID, rpName } = getRpConfig();
  const userHandle = randomToken(16);
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: "admin",
    userID: new TextEncoder().encode(userHandle),
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "preferred",
    },
    excludeCredentials: [],
  });

  const token = randomToken();
  const challenges = await getChallengeCollection();
  await challenges.insertOne({
    _id: token,
    kind: "register",
    challenge: options.challenge,
    userHandle,
    expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
  });
  setChallengeCookie(res, token);

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json(options);
}
