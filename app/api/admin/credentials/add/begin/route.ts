import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { getAdminCollection, getChallengeCollection } from "@/server/lib/mongo";
import { randomToken, setChallengeCookie } from "@/server/lib/session";
import { getRpConfig } from "@/server/lib/webauthn";
import { errorResponse, withAdmin } from "@/server/lib/route-helpers";

export const dynamic = "force-dynamic";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export const POST = withAdmin(async (): Promise<Response> => {
  try {
    const admin = await getAdminCollection();
    const adminDoc = await admin.findOne({ _id: "admin" });
    if (!adminDoc) {
      return NextResponse.json(
        { error: "no_admin" },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
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
    await setChallengeCookie(token);

    return NextResponse.json(options, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return errorResponse(err);
  }
});
