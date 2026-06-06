import { NextResponse } from "next/server";
import {
  verifyAuthenticationResponse,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/server";
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
      challenge.kind !== "login" ||
      challenge.expiresAt.getTime() <= Date.now()
    ) {
      return NextResponse.json(
        { error: "invalid_challenge" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    let response: AuthenticationResponseJSON;
    try {
      response = (await req.json()) as AuthenticationResponseJSON;
    } catch {
      response = {} as AuthenticationResponseJSON;
    }

    const admin = await getAdminCollection();
    const adminDoc = await admin.findOne({ _id: "admin" });
    if (!adminDoc) {
      return NextResponse.json(
        { error: "no_admin" },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    const credential = adminDoc.credentials.find((c) => c.id === response.id);
    if (!credential) {
      return NextResponse.json(
        { error: "unknown_credential" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const { rpID, origin } = getRpConfig();
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: credential.id,
        publicKey: new Uint8Array(
          Buffer.from(credential.publicKey, "base64url"),
        ),
        counter: credential.counter,
        transports: credential.transports,
      },
      requireUserVerification: false,
    });

    if (!verification.verified) {
      return NextResponse.json(
        { error: "verification_failed" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
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
