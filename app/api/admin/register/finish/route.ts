import { NextResponse } from "next/server";
import {
  verifyRegistrationResponse,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { MongoServerError } from "mongodb";
import { getAdminCollection, getChallengeCollection } from "@/server/lib/mongo";
import {
  CHALLENGE_COOKIE,
  clearChallengeCookie,
  createSession,
  readCookie,
  setSessionCookie,
} from "@/server/lib/session";
import { getRpConfig } from "@/server/lib/webauthn";
import { errorResponse } from "@/server/lib/route-helpers";
import type {
  AdminCredential,
  PasskeyTransport,
} from "@/shared/data/schemas";

export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  try {
    const token = await readCookie(CHALLENGE_COOKIE);
    if (!token) {
      return NextResponse.json(
        { error: "missing_challenge" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const challenges = await getChallengeCollection();
    const challenge = await challenges.findOne({ _id: token });
    if (
      !challenge ||
      challenge.kind !== "register" ||
      challenge.expiresAt.getTime() <= Date.now() ||
      !challenge.userHandle
    ) {
      return NextResponse.json(
        { error: "invalid_challenge" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const { rpID, origin } = getRpConfig();
    let response: RegistrationResponseJSON;
    try {
      response = (await req.json()) as RegistrationResponseJSON;
    } catch {
      response = {} as RegistrationResponseJSON;
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json(
        { error: "verification_failed" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
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
        return NextResponse.json(
          { error: "admin_exists" },
          { status: 409, headers: { "Cache-Control": "no-store" } },
        );
      }
      throw err;
    }

    await challenges.deleteOne({ _id: token });
    await clearChallengeCookie();
    const session = await createSession();
    await setSessionCookie(session.id);

    return NextResponse.json(
      { ok: true },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return errorResponse(err);
  }
}
