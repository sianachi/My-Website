import { Router } from "express";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { MongoServerError } from "mongodb";
import {
  getAdminCollection,
  getChallengeCollection,
} from "../../lib/mongo.js";
import {
  CHALLENGE_COOKIE,
  clearChallengeCookie,
  clearSessionCookie,
  createSession,
  destroySession,
  getCookies,
  randomToken,
  readSession,
  requireAdmin,
  SESSION_COOKIE,
  setChallengeCookie,
  setSessionCookie,
} from "../../lib/session.js";
import { getRpConfig } from "../../lib/webauthn.js";
import type {
  AdminCredential,
  PasskeyTransport,
} from "../../../src/shared/data/schemas.js";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export const adminAuthRouter = Router();

adminAuthRouter.get("/status", async (req, res) => {
  const admin = await getAdminCollection();
  const adminDoc = await admin.findOne({ _id: "admin" });
  const session = await readSession(req);

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    hasAdmin: !!adminDoc,
    authenticated: !!session,
  });
});

adminAuthRouter.get("/me", async (req, res) => {
  const session = await requireAdmin(req, res);
  if (!session) return;

  const admin = await getAdminCollection();
  const doc = await admin.findOne({ _id: "admin" });

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    authenticated: true,
    credentialCount: doc?.credentials.length ?? 0,
    expiresAt: session.expiresAt.toISOString(),
  });
});

adminAuthRouter.post("/logout", async (req, res) => {
  const id = getCookies(req)[SESSION_COOKIE];
  if (id) await destroySession(id);
  clearSessionCookie(res);

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ ok: true });
});

adminAuthRouter.post("/login/begin", async (_req, res) => {
  const admin = await getAdminCollection();
  const adminDoc = await admin.findOne({ _id: "admin" });
  if (!adminDoc) {
    res.status(404).json({ error: "no_admin" });
    return;
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
  res.status(200).json(options);
});

adminAuthRouter.post("/login/finish", async (req, res) => {
  const token = getCookies(req)[CHALLENGE_COOKIE];
  if (!token) {
    res.status(400).json({ error: "missing_challenge" });
    return;
  }

  const challenges = await getChallengeCollection();
  const challenge = await challenges.findOne({ _id: token });
  if (
    !challenge ||
    challenge.kind !== "login" ||
    challenge.expiresAt.getTime() <= Date.now()
  ) {
    res.status(400).json({ error: "invalid_challenge" });
    return;
  }

  const response = req.body as AuthenticationResponseJSON;
  const admin = await getAdminCollection();
  const adminDoc = await admin.findOne({ _id: "admin" });
  if (!adminDoc) {
    res.status(404).json({ error: "no_admin" });
    return;
  }

  const credential = adminDoc.credentials.find((c) => c.id === response.id);
  if (!credential) {
    res.status(400).json({ error: "unknown_credential" });
    return;
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
    res.status(400).json({ error: "verification_failed" });
    return;
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
  res.status(200).json({ ok: true });
});

adminAuthRouter.post("/register/begin", async (_req, res) => {
  const admin = await getAdminCollection();
  if (await admin.findOne({ _id: "admin" })) {
    res.status(409).json({ error: "admin_exists" });
    return;
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
  res.status(200).json(options);
});

adminAuthRouter.post("/register/finish", async (req, res) => {
  const token = getCookies(req)[CHALLENGE_COOKIE];
  if (!token) {
    res.status(400).json({ error: "missing_challenge" });
    return;
  }

  const challenges = await getChallengeCollection();
  const challenge = await challenges.findOne({ _id: token });
  if (
    !challenge ||
    challenge.kind !== "register" ||
    challenge.expiresAt.getTime() <= Date.now() ||
    !challenge.userHandle
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
  try {
    await admin.insertOne({
      _id: "admin",
      userHandle: challenge.userHandle,
      credentials: [credential],
      createdAt: new Date(),
    });
  } catch (err) {
    if (err instanceof MongoServerError && err.code === 11000) {
      res.status(409).json({ error: "admin_exists" });
      return;
    }
    throw err;
  }

  await challenges.deleteOne({ _id: token });
  clearChallengeCookie(res);
  const session = await createSession();
  setSessionCookie(res, session.id);

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ ok: true });
});
