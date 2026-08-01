import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { PLANS, normalizePlanId, type PlanId } from "@/types";
import { isStripeConfigured, stripePriceIdForBilling } from "@/lib/billing";
import { ensureStripeCustomerForCheckout } from "@/lib/stripeSubscriptionSync";

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
  if (!priceId || priceId.startsWith("price_pro_") || priceId.startsWith("price_premium_")) {
    return NextResponse.json(
      { error: "Replace placeholder Stripe price IDs in PLANS before checkout." },
      { status: 501 }
    );
  }

  const origin =
    request.headers.get("origin") ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, contact_email, contact_email_verified_at")
    .eq("id", user.id)
    .maybeSingle();

  const existingCustomerId =
    typeof profile?.stripe_customer_id === "string" ? profile.stripe_customer_id : undefined;
  const contactEmail =
    profile?.contact_email_verified_at && typeof profile?.contact_email === "string"
      ? profile.contact_email
      : typeof profile?.contact_email === "string"
        ? profile.contact_email
        : null;

  try {
    const customerId = await ensureStripeCustomerForCheckout(
      stripe,
      user.id,
      user.email,
      existingCustomerId,
      contactEmail
    );

    if (customerId !== existingCustomerId) {
      await supabase
        .from("profiles")
        .update({
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      payment_method_types: ["card"],
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard?checkout=success&plan=${plan}`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
      client_reference_id: user.id,
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
      // Hosted Checkout copy — Dashboard branding (logo/colors) still applies account-wide.
      custom_text: {
        submit: {
          message: "Grow with Proveit — navy grit, lime energy. Cancel anytime in Settings.",
        },
      },
    };

    // Prefer rounded navy/lime look when the Stripe account/API supports branding_settings.
    const withBranding = {
      ...sessionParams,
      branding_settings: {
        background_color: "#050a18",
        button_color: "#7cff01",
        border_style: "rounded",
        font_family: "inter",
      },
    } as Stripe.Checkout.SessionCreateParams;

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create(withBranding);
    } catch {
      session = await stripe.checkout.sessions.create(sessionParams);
    }

    if (!session.url) {
      return NextResponse.json({ error: "Could not start checkout." }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
