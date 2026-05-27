import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { normalizePlanId, type PlanId } from "@/types";
import { getGraceDayResetBalance } from "@/lib/subscriptionLimits";
import { isStripeConfigured } from "@/lib/billing";

export const runtime = "nodejs";

async function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function applyPaidPlan(
  userId: string,
  plan: PlanId,
  billing: "monthly" | "yearly"
) {
  if (plan !== "pro" && plan !== "premium") return;

  const admin = await adminClient();
  if (!admin) return;

  await admin
    .from("profiles")
    .update({
      plan,
      plan_billing: billing,
      grace_day_balance: getGraceDayResetBalance(plan),
      grace_day_cycle_anchor: new Date().toISOString(),
      premium_trial_ends_at: null,
      premium_trial_revert_plan: null,
      trial_expired_needs_review: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
}

async function revertToFree(userId: string) {
  const admin = await adminClient();
  if (!admin) return;

  await admin
    .from("profiles")
    .update({
      plan: "free",
      plan_billing: null,
      grace_day_balance: 0,
      grace_day_cycle_anchor: new Date().toISOString(),
      strict_ai_verification: false,
      premium_trial_ends_at: null,
      premium_trial_revert_plan: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
}

function billingFromMetadata(metadata: Stripe.Metadata | null | undefined): "monthly" | "yearly" {
  return metadata?.billing === "yearly" ? "yearly" : "monthly";
}

export async function POST(request: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 501 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 501 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = normalizePlanId(session.metadata?.plan);
        if (userId && (plan === "pro" || plan === "premium")) {
          await applyPaidPlan(userId, plan, billingFromMetadata(session.metadata));
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        const plan = normalizePlanId(sub.metadata?.plan);
        if (!userId) break;
        if (sub.status === "active" || sub.status === "trialing") {
          if (plan === "pro" || plan === "premium") {
            await applyPaidPlan(userId, plan, billingFromMetadata(sub.metadata));
          }
        } else if (sub.status === "canceled" || sub.status === "unpaid" || sub.status === "past_due") {
          await revertToFree(userId);
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (userId) await revertToFree(userId);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook handler failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
