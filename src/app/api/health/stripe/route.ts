import { NextResponse } from "next/server";
import { isStripeConfigured, isStripeLiveMode, stripeKeyMode } from "@/lib/billing";

export const dynamic = "force-dynamic";

export async function GET() {
  const secretConfigured = Boolean(process.env.STRIPE_SECRET_KEY?.trim());
  const webhookConfigured = Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
  const mode = stripeKeyMode();
  return NextResponse.json({
    stripeConfigured: isStripeConfigured(),
    stripeMode: mode,
    liveMode: isStripeLiveMode(),
    secretKeyConfigured: secretConfigured,
    webhookSecretConfigured: webhookConfigured,
    readyForCheckout: isStripeConfigured() && isStripeLiveMode(),
    readyForWebhooks: secretConfigured && webhookConfigured,
    note:
      mode === "test"
        ? "Checkout is in Stripe TEST mode — real users will see test bank/card instructions. Switch Vercel Production to sk_live_ / pk_live_."
        : mode === "live"
          ? "Stripe is in live mode."
          : null,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    checkedAt: new Date().toISOString(),
  });
}
