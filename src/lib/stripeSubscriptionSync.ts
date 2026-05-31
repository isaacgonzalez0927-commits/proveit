import Stripe from "stripe";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { PLANS, normalizePlanId, type PlanId } from "@/types";
import {
  freezeRemindersBeyondLimit,
  getActiveReminderLimit,
  getGraceDayResetBalance,
  getMaxGoalsForPlan,
} from "@/lib/subscriptionLimits";

export function planIdFromStripePriceId(priceId: string | undefined | null): PlanId | null {
  if (!priceId) return null;
  for (const plan of PLANS) {
    if (plan.id === "free") continue;
    if (plan.stripePriceIdMonthly === priceId || plan.stripePriceIdYearly === priceId) {
      return plan.id;
    }
  }
  return null;
}

export function billingFromStripePriceId(priceId: string | undefined | null): "monthly" | "yearly" {
  if (!priceId) return "monthly";
  for (const plan of PLANS) {
    if (plan.stripePriceIdYearly === priceId) return "yearly";
  }
  return "monthly";
}

export function priceIdFromSubscription(sub: Stripe.Subscription): string | undefined {
  const item = sub.items?.data?.[0];
  if (!item) return undefined;
  const price = item.price;
  if (typeof price === "string") return price;
  return price?.id;
}

export function resolvePlanFromSubscription(sub: Stripe.Subscription): PlanId | null {
  const fromMeta = normalizePlanId(sub.metadata?.plan);
  if (fromMeta === "pro" || fromMeta === "premium") return fromMeta;
  return planIdFromStripePriceId(priceIdFromSubscription(sub));
}

export async function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function countActiveGoals(
  admin: NonNullable<Awaited<ReturnType<typeof adminClient>>>,
  userId: string
) {
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
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row.reminder_time) continue;
    const shouldBeActive = frozen[i]?.reminderIsActive !== false;
    const currentlyActive = row.reminder_is_active !== false;
    if (shouldBeActive !== currentlyActive && typeof row.id === "string") {
      await admin.from("goals").update({ reminder_is_active: shouldBeActive }).eq("id", row.id);
    }
  }
}

export async function applyPaidPlan(
  userId: string,
  plan: PlanId,
  billing: "monthly" | "yearly",
  stripeCustomerId?: string | null,
  stripeSubscriptionId?: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (plan !== "pro" && plan !== "premium") {
    return { ok: false, error: "Invalid paid plan" };
  }

  const admin = await adminClient();
  if (!admin) return { ok: false, error: "Server database not configured" };

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

  const { data, error } = await admin
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("applyPaidPlan: profile update failed", userId, error.message);
    return { ok: false, error: error.message };
  }
  if (!data) {
    return { ok: false, error: "Profile not found for user" };
  }

  await freezeExcessReminders(admin, userId, plan);
  return { ok: true };
}

export async function revertToFree(userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await adminClient();
  if (!admin) return { ok: false, error: "Server database not configured" };

  const activeGoals = await countActiveGoals(admin, userId);
  const freeLimit = getMaxGoalsForPlan("free");
  const needsReview = activeGoals > freeLimit;

  const { error } = await admin
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

  if (error) {
    console.error("revertToFree: profile update failed", userId, error.message);
    return { ok: false, error: error.message };
  }

  await freezeExcessReminders(admin, userId, "free");
  return { ok: true };
}

export async function lookupUserIdByStripeCustomer(
  customerId: string
): Promise<string | null> {
  const admin = await adminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return typeof data?.id === "string" ? data.id : null;
}

/** Pull active subscription from Stripe and write plan to profiles (webhook recovery). */
export async function syncStripeSubscriptionForUser(
  stripe: Stripe,
  userId: string,
  opts?: { email?: string | null }
): Promise<
  | { ok: true; plan: PlanId; billing: "monthly" | "yearly" }
  | { ok: false; error: string }
> {
  const admin = await adminClient();
  if (!admin) return { ok: false, error: "Server database not configured" };

  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id, email")
    .eq("id", userId)
    .maybeSingle();

  let customerId =
    typeof profile?.stripe_customer_id === "string" ? profile.stripe_customer_id : null;

  const email = opts?.email ?? (typeof profile?.email === "string" ? profile.email : null);
  if (!customerId && email) {
    const customers = await stripe.customers.list({ email, limit: 5 });
    customerId = customers.data[0]?.id ?? null;
  }

  if (!customerId) {
    return { ok: false, error: "No Stripe customer found for this account." };
  }

  const list = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
  });

  const sub =
    list.data.find((s) => s.status === "active" || s.status === "trialing") ?? null;

  if (!sub) {
    return { ok: false, error: "No active subscription found in Stripe for this account." };
  }

  const plan = resolvePlanFromSubscription(sub);
  if (plan !== "pro" && plan !== "premium") {
    return { ok: false, error: "Could not determine Pro or Premium from Stripe subscription." };
  }

  const priceId = priceIdFromSubscription(sub);
  const billing =
    sub.metadata?.billing === "yearly" || sub.metadata?.billing === "monthly"
      ? sub.metadata.billing
      : billingFromStripePriceId(priceId);

  const customer =
    typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? customerId;

  const applied = await applyPaidPlan(userId, plan, billing, customer, sub.id);
  if (!applied.ok) return applied;

  return { ok: true, plan, billing };
}
