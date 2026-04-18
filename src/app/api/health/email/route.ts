import { NextResponse } from "next/server";
import { mustUseVerifiedResendFrom, readResendFromEnv } from "@/lib/resendFrom";

export const dynamic = "force-dynamic";

/**
 * No secrets. Confirms whether Production can resolve a Resend "from" address after env + redeploy.
 */
export async function GET() {
  const productionRequiresVerifiedSender = mustUseVerifiedResendFrom();
  const senderResolved = Boolean(readResendFromEnv());
  return NextResponse.json({
    productionRequiresVerifiedSender,
    senderResolved,
    readyForProductionEmail: !productionRequiresVerifiedSender || senderResolved,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    checkedAt: new Date().toISOString(),
  });
}
