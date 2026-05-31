import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { isStripeConfigured } from "@/lib/billing";
import { syncStripeSubscriptionForUser } from "@/lib/stripeSubscriptionSync";

/** Reconcile profiles.plan with Stripe when webhook delivery was missed. */
export async function POST() {
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

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const result = await syncStripeSubscriptionForUser(stripe, user.id, {
    email: user.email,
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
