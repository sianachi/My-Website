import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import {
  getAdminCollection,
  getChallengeCollection,
} from "../../_lib/mongo.js";
import {
  CHALLENGE_COOKIE,
  clearChallengeCookie,
  createSession,
  getCookies,
  setSessionCookie,
} from "../../_lib/session.js";
import { getRpConfig } from "../../_lib/webauthn.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const token = getCookies(req)[CHALLENGE_COOKIE];
  if (!token) {
    return res.status(400).json({ error: "missing_challenge" });
  }

  const challenges = await getChallengeCollection();
  const challenge = await challenges.findOne({ _id: token });
  if (
    !challenge ||
    challenge.kind !== "login" ||
    challenge.expiresAt.getTime() <= Date.now()
  ) {
    return res.status(400).json({ error: "invalid_challenge" });
  }

  const response = req.body as AuthenticationResponseJSON;
  const admin = await getAdminCollection();
  const adminDoc = await admin.findOne({ _id: "admin" });
  if (!adminDoc) {
    return res.status(404).json({ error: "no_admin" });
  }

  const credential = adminDoc.credentials.find((c) => c.id === response.id);
  if (!credential) {
    return res.status(400).json({ error: "unknown_credential" });
  }

  const { rpID, origin } = getRpConfig();
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: credential.id,
      publicKey: new Uint8Array(Buffer.from(credential.publicKey, "base64url")),
      counter: credential.counter,
      transports: credential.transports,
    },
    requireUserVerification: false,
  });

  if (!verification.verified) {
    return res.status(400).json({ error: "verification_failed" });
  }

  await admin.updateOne(
    { _id: "admin", "credentials.id": credential.id },
    {
      $set: {
        "credentials.$.counter": verification.authenticationInfo.newCounter,
        "credentials.$.lastUsedAt": new Date(),
      },
    },
  );

  await challenges.deleteOne({ _id: token });
  clearChallengeCookie(res);
  const session = await createSession();
  setSessionCookie(res, session.id);

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ ok: true });
}
