import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { isStripeConfigured } from "@/lib/billing";

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
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, plan")
    .eq("id", user.id)
    .maybeSingle();

  const customerId =
    typeof profile?.stripe_customer_id === "string" ? profile.stripe_customer_id : null;
  if (!customerId) {
    return NextResponse.json(
      { error: "No subscription on file. Subscribe from Pricing first." },
      { status: 400 }
    );
  }

  let origin = "";
  try {
    const body = await request.json().catch(() => ({}));
    const rawOrigin = body.origin ?? request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
    origin = rawOrigin ? (rawOrigin.startsWith("http") ? rawOrigin : `https://${rawOrigin}`) : "";
  } catch {
    origin = "";
  }
  if (!origin) {
    return NextResponse.json({ error: "Could not determine site URL." }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/settings`,
    });
    if (!portal.url) {
      return NextResponse.json({ error: "Could not open billing portal." }, { status: 500 });
    }
    return NextResponse.json({ url: portal.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Billing portal failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
