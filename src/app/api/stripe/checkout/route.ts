import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { PLANS, normalizePlanId, type PlanId } from "@/types";
import { isStripeConfigured, stripePriceIdForBilling } from "@/lib/billing";

export async function POST(request: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Billing is not configured yet." }, { status: 501 });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const plan = normalizePlanId(body.plan) as PlanId;
  const billing = body.billing === "yearly" ? "yearly" : "monthly";

  if (plan === "free") {
    return NextResponse.json({ error: "Free plan does not require checkout." }, { status: 400 });
  }

  const planDef = PLANS.find((p) => p.id === plan);
  const priceId = planDef ? stripePriceIdForBilling(planDef, billing) : undefined;
  if (!priceId) {
    return NextResponse.json({ error: "Price not configured for this plan." }, { status: 501 });
  }

  const origin =
    request.headers.get("origin") ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
      metadata: {
        userId: user.id,
        plan,
        billing,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          plan,
          billing,
        },
      },
    });

    if (!session.url) {
      return NextResponse.json({ error: "Could not start checkout." }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
