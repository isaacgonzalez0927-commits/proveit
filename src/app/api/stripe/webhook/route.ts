import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { normalizePlanId, type PlanId } from "@/types";
import {
  freezeRemindersBeyondLimit,
  getActiveReminderLimit,
  getGraceDayResetBalance,
  getMaxGoalsForPlan,
} from "@/lib/subscriptionLimits";
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

async function countActiveGoals(admin: NonNullable<Awaited<ReturnType<typeof adminClient>>>, userId: string) {
  const { count, error } = await admin
    .from("goals")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("archived_at", null);
  if (error) return 0;
  return count ?? 0;
}

async function freezeExcessReminders(
  admin: NonNullable<Awaited<ReturnType<typeof adminClient>>>,
  userId: string,
  plan: PlanId
) {
  const limit = getActiveReminderLimit(plan);
  const { data } = await admin
    .from("goals")
    .select("id, reminder_time, reminder_is_active, created_at, archived_at")
    .eq("user_id", userId)
    .is("archived_at", null)
    .order("created_at", { ascending: true });
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const frozen = freezeRemindersBeyondLimit(
    rows.map((row) => ({
      reminderTime: typeof row.reminder_time === "string" ? row.reminder_time : undefined,
      reminderIsActive: row.reminder_is_active !== false,
      createdAt: String(row.created_at ?? ""),
      archivedAt: undefined,
    })),
    limit
  );
  let activeSeen = 0;
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row.reminder_time) continue;
    const shouldBeActive = frozen[i]?.reminderIsActive !== false;
    const currentlyActive = row.reminder_is_active !== false;
    if (shouldBeActive) activeSeen += 1;
    if (shouldBeActive !== currentlyActive && typeof row.id === "string") {
      await admin.from("goals").update({ reminder_is_active: shouldBeActive }).eq("id", row.id);
    }
  }
}

async function applyPaidPlan(
  userId: string,
  plan: PlanId,
  billing: "monthly" | "yearly",
  stripeCustomerId?: string | null,
  stripeSubscriptionId?: string | null
) {
  if (plan !== "pro" && plan !== "premium") return;

  const admin = await adminClient();
  if (!admin) return;

  const updates: Record<string, unknown> = {
    plan,
    plan_billing: billing,
    grace_day_balance: getGraceDayResetBalance(plan),
    grace_day_cycle_anchor: new Date().toISOString(),
    premium_trial_ends_at: null,
    premium_trial_revert_plan: null,
    trial_expired_needs_review: false,
    updated_at: new Date().toISOString(),
  };
  if (stripeCustomerId) updates.stripe_customer_id = stripeCustomerId;
  if (stripeSubscriptionId) updates.stripe_subscription_id = stripeSubscriptionId;

  await admin.from("profiles").update(updates).eq("id", userId);
  await freezeExcessReminders(admin, userId, plan);
}

async function revertToFree(userId: string) {
  const admin = await adminClient();
  if (!admin) return;

  const activeGoals = await countActiveGoals(admin, userId);
  const freeLimit = getMaxGoalsForPlan("free");
  const needsReview = activeGoals > freeLimit;

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
      stripe_subscription_id: null,
      trial_expired_needs_review: needsReview,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  await freezeExcessReminders(admin, userId, "free");
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
        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id ?? null;
        if (userId && (plan === "pro" || plan === "premium")) {
          await applyPaidPlan(
            userId,
            plan,
            billingFromMetadata(session.metadata),
            customerId,
            subscriptionId
          );
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        const plan = normalizePlanId(sub.metadata?.plan);
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;
        if (!userId) break;
        if (sub.status === "active" || sub.status === "trialing") {
          if (plan === "pro" || plan === "premium") {
            await applyPaidPlan(userId, plan, billingFromMetadata(sub.metadata), customerId, sub.id);
          }
        } else if (
          sub.status === "canceled" ||
          sub.status === "unpaid" ||
          sub.status === "past_due" ||
          sub.status === "incomplete_expired"
        ) {
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
