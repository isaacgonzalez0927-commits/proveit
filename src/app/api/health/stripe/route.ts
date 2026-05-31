import { NextResponse } from "next/server";
import { isStripeConfigured, isStripeLiveMode, stripeKeyMode } from "@/lib/billing";

export const dynamic = "force-dynamic";

const WEBHOOK_SECRET_KEY = "STRIPE_WEBHOOK_SECRET";

/** Common misnamed vars — helps debug Vercel env without exposing values. */
const WEBHOOK_SECRET_ALIASES = [
  "STRIPE_WEBHOOK_SIGNING_SECRET",
  "STRIPE_WEBHOOK_KEY",
  "WEBHOOK_SECRET",
  "STRIPE_SIGNING_SECRET",
] as const;

function envKeyPresent(name: string): boolean {
  const v = process.env[name];
  return typeof v === "string" && v.trim().length > 0;
}

function envKeyLooksLikeWebhookSecret(name: string): boolean {
  const v = process.env[name]?.trim() ?? "";
  return v.startsWith("whsec_");
}

export async function GET() {
  const secretConfigured = envKeyPresent("STRIPE_SECRET_KEY");
  const webhookConfigured = envKeyPresent(WEBHOOK_SECRET_KEY);
  const mode = stripeKeyMode();

  const stripeEnvKeysPresent = Object.keys(process.env)
    .filter((k) => k.startsWith("STRIPE_"))
    .sort();

  const wrongNameWithValue = WEBHOOK_SECRET_ALIASES.filter(envKeyPresent);
  const webhookSecretFormatOk =
    webhookConfigured && envKeyLooksLikeWebhookSecret(WEBHOOK_SECRET_KEY);

  const supabaseServiceRoleConfigured = envKeyPresent("SUPABASE_SERVICE_ROLE_KEY");

  return NextResponse.json({
    stripeConfigured: isStripeConfigured(),
    stripeMode: mode,
    liveMode: isStripeLiveMode(),
    secretKeyConfigured: secretConfigured,
    webhookSecretConfigured: webhookConfigured,
    webhookSecretFormatOk,
    readyForCheckout: isStripeConfigured() && isStripeLiveMode(),
    readyForWebhooks: secretConfigured && webhookConfigured,
    /** Names only — confirms what Production actually loaded from Vercel. */
    stripeEnvKeysPresent,
    wrongWebhookSecretNameUsed:
      !webhookConfigured && wrongNameWithValue.length > 0 ? wrongNameWithValue : null,
    expectedWebhookEnvKey: WEBHOOK_SECRET_KEY,
    /** Webhook can verify signatures but still fail to update plans without this. */
    supabaseServiceRoleConfigured,
    note:
      mode === "test"
        ? "Checkout is in Stripe TEST mode — real users will see test bank/card instructions. Switch Vercel Production to sk_live_ / pk_live_."
        : mode === "live"
          ? "Stripe is in live mode."
          : null,
    troubleshooting:
      !webhookConfigured
        ? `Production does not see ${WEBHOOK_SECRET_KEY}. In Vercel: exact name, Production checked, Redeploy (Deployments → Redeploy). Not Supabase.`
        : !webhookSecretFormatOk
          ? `${WEBHOOK_SECRET_KEY} should start with whsec_ (from Stripe → Webhooks → signing secret, test vs live must match your API keys).`
          : !supabaseServiceRoleConfigured
            ? "Webhook secret is set; add SUPABASE_SERVICE_ROLE_KEY on Vercel so paid plans can write to profiles."
            : null,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    checkedAt: new Date().toISOString(),
  });
}
