import { NextResponse } from "next/server";
import { isStripeConfigured } from "@/lib/billing";

export const dynamic = "force-dynamic";

export async function GET() {
  const secretConfigured = Boolean(process.env.STRIPE_SECRET_KEY?.trim());
  const webhookConfigured = Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
  return NextResponse.json({
    stripeConfigured: isStripeConfigured(),
    secretKeyConfigured: secretConfigured,
    webhookSecretConfigured: webhookConfigured,
    readyForCheckout: isStripeConfigured(),
    readyForWebhooks: secretConfigured && webhookConfigured,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    checkedAt: new Date().toISOString(),
  });
}
