import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { isStripeConfigured } from "@/lib/billing";
import { syncStripeSubscriptionForUser } from "@/lib/stripeSubscriptionSync";

/** Reconcile profiles.plan with Stripe when webhook delivery was missed. */
export async function POST(request: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Billing is not configured." }, { status: 501 });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let checkoutEmail: string | null = null;
  try {
    const body = (await request.json().catch(() => ({}))) as { checkoutEmail?: unknown };
    if (typeof body.checkoutEmail === "string" && body.checkoutEmail.trim()) {
      checkoutEmail = body.checkoutEmail.trim().toLowerCase();
    }
  } catch {
    checkoutEmail = null;
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const result = await syncStripeSubscriptionForUser(stripe, user.id, {
    authEmail: user.email,
    checkoutEmail,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    plan: result.plan,
    billing: result.billing,
  });
}
