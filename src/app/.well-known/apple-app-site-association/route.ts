import { NextResponse } from "next/server";
import { buildAppleAppSiteAssociation } from "@/lib/appleAppSiteAssociation";

/** Apple Universal Links verification (required for invite links to open the iOS app). */
export async function GET() {
  const teamId = process.env.APPLE_TEAM_ID?.trim();
  if (!teamId) {
    return NextResponse.json(
      {
        error:
          "APPLE_TEAM_ID is not configured. Set it in Vercel to enable Universal Links.",
      },
      { status: 503 }
    );
  }

  const body = buildAppleAppSiteAssociation(teamId);
  return NextResponse.json(body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
