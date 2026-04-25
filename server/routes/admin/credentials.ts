import { Router } from "express";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import {
  getAdminCollection,
  getChallengeCollection,
} from "../../lib/mongo.js";
import {
  CHALLENGE_COOKIE,
  clearChallengeCookie,
  getCookies,
  randomToken,
  requireAdmin,
  setChallengeCookie,
} from "../../lib/session.js";
import { getRpConfig } from "../../lib/webauthn.js";
import type {
  AdminCredential,
  PasskeyTransport,
} from "../../../src/shared/data/schemas.js";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export const adminCredentialsRouter = Router();

adminCredentialsRouter.post("/add/begin", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;

  const admin = await getAdminCollection();
  const adminDoc = await admin.findOne({ _id: "admin" });
  if (!adminDoc) {
    res.status(404).json({ error: "no_admin" });
    return;
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
  res.status(200).json(options);
});

adminCredentialsRouter.post("/add/finish", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;

  const token = getCookies(req)[CHALLENGE_COOKIE];
  if (!token) {
    res.status(400).json({ error: "missing_challenge" });
    return;
  }

  const challenges = await getChallengeCollection();
  const challenge = await challenges.findOne({ _id: token });
  if (
    !challenge ||
    challenge.kind !== "add-credential" ||
    challenge.expiresAt.getTime() <= Date.now()
  ) {
    res.status(400).json({ error: "invalid_challenge" });
    return;
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
    res.status(400).json({ error: "verification_failed" });
    return;
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
    res.status(409).json({ error: "credential_exists" });
    return;
  }

  await challenges.deleteOne({ _id: token });
  clearChallengeCookie(res);

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ ok: true });
});
