import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { getAdminCollection, getChallengeCollection } from "@/server/lib/mongo";
import { randomToken, setChallengeCookie } from "@/server/lib/session";
import { getRpConfig } from "@/server/lib/webauthn";
import { errorResponse } from "@/server/lib/route-helpers";

export const dynamic = "force-dynamic";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export async function POST(): Promise<Response> {
  try {
    const admin = await getAdminCollection();
    if (await admin.findOne({ _id: "admin" })) {
      return NextResponse.json(
        { error: "admin_exists" },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
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
    await setChallengeCookie(token);

    return NextResponse.json(options, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
