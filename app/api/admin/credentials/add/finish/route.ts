import { NextResponse } from "next/server";
import {
  verifyRegistrationResponse,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { getAdminCollection, getChallengeCollection } from "@/server/lib/mongo";
import {
  CHALLENGE_COOKIE,
  clearChallengeCookie,
  readCookie,
} from "@/server/lib/session";
import { getRpConfig } from "@/server/lib/webauthn";
import { errorResponse, withAdmin } from "@/server/lib/route-helpers";
import type {
  AdminCredential,
  PasskeyTransport,
} from "@/shared/data/schemas";

export const dynamic = "force-dynamic";

export const POST = withAdmin(async (_session, req: Request): Promise<Response> => {
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
      challenge.kind !== "add-credential" ||
      challenge.expiresAt.getTime() <= Date.now()
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
    const update = await admin.updateOne(
      { _id: "admin", "credentials.id": { $ne: credential.id } },
      { $push: { credentials: credential } },
    );
    if (update.matchedCount === 0) {
      return NextResponse.json(
        { error: "credential_exists" },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }

    await challenges.deleteOne({ _id: token });
    await clearChallengeCookie();

    return NextResponse.json(
      { ok: true },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return errorResponse(err);
  }
});
