import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { getAdminCollection, getChallengeCollection } from "@/server/lib/mongo";
import { randomToken, setChallengeCookie } from "@/server/lib/session";
import { getRpConfig } from "@/server/lib/webauthn";
import { errorResponse } from "@/server/lib/route-helpers";

export const dynamic = "force-dynamic";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export async function POST(): Promise<Response> {
  try {
    const admin = await getAdminCollection();
    const adminDoc = await admin.findOne({ _id: "admin" });
    if (!adminDoc) {
      return NextResponse.json(
        { error: "no_admin" },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
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
    await setChallengeCookie(token);

    return NextResponse.json(options, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
