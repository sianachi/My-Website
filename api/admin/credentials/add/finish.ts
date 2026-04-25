import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import {
  getAdminCollection,
  getChallengeCollection,
} from "../../../_lib/mongo.js";
import {
  CHALLENGE_COOKIE,
  clearChallengeCookie,
  getCookies,
  requireAdmin,
} from "../../../_lib/session.js";
import { getRpConfig } from "../../../_lib/webauthn.js";
import type {
  AdminCredential,
  PasskeyTransport,
} from "../../../../src/shared/data/schemas.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  if (!(await requireAdmin(req, res))) return;

  const token = getCookies(req)[CHALLENGE_COOKIE];
  if (!token) {
    return res.status(400).json({ error: "missing_challenge" });
  }

  const challenges = await getChallengeCollection();
  const challenge = await challenges.findOne({ _id: token });
  if (
    !challenge ||
    challenge.kind !== "add-credential" ||
    challenge.expiresAt.getTime() <= Date.now()
  ) {
    return res.status(400).json({ error: "invalid_challenge" });
  }

  const { rpID, origin } = getRpConfig();
  const response = req.body as RegistrationResponseJSON;
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: false,
  });

  if (!verification.verified || !verification.registrationInfo) {
    return res.status(400).json({ error: "verification_failed" });
  }

  const info = verification.registrationInfo;
  const credential: AdminCredential = {
    id: info.credential.id,
    publicKey: Buffer.from(info.credential.publicKey).toString("base64url"),
    counter: info.credential.counter,
    transports: info.credential.transports as PasskeyTransport[] | undefined,
    deviceType: info.credentialDeviceType,
    backedUp: info.credentialBackedUp,
    createdAt: new Date(),
  };

  const admin = await getAdminCollection();
  const update = await admin.updateOne(
    { _id: "admin", "credentials.id": { $ne: credential.id } },
    { $push: { credentials: credential } },
  );
  if (update.matchedCount === 0) {
    return res.status(409).json({ error: "credential_exists" });
  }

  await challenges.deleteOne({ _id: token });
  clearChallengeCookie(res);

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ ok: true });
}
