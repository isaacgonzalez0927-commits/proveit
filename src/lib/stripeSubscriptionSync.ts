import Stripe from "stripe";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { isInternalAuthEmail } from "@/lib/usernameAuth";
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

function isPaidSubscriptionStatus(status: Stripe.Subscription.Status): boolean {
  return status === "active" || status === "trialing";
}

async function retrievePaidSubscription(
  stripe: Stripe,
  subscriptionId: string
): Promise<Stripe.Subscription | null> {
  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    return isPaidSubscriptionStatus(sub.status) ? sub : null;
  } catch {
    return null;
  }
}

async function searchPaidSubscriptionByMetadata(
  stripe: Stripe,
  userId: string
): Promise<Stripe.Subscription | null> {
  try {
    const result = await stripe.subscriptions.search({
      query: `metadata['userId']:'${userId}'`,
      limit: 10,
    });
    return result.data.find((s) => isPaidSubscriptionStatus(s.status)) ?? null;
  } catch {
    return null;
  }
}

function collectLookupEmails(
  profile: Record<string, unknown> | null,
  opts?: { authEmail?: string | null; checkoutEmail?: string | null }
): string[] {
  const emails = new Set<string>();
  const add = (raw: unknown) => {
    if (typeof raw !== "string") return;
    const e = raw.trim().toLowerCase();
    if (e.includes("@")) emails.add(e);
  };
  add(opts?.checkoutEmail);
  add(opts?.authEmail);
  add(profile?.email);
  add(profile?.contact_email);
  add(profile?.contact_email_pending);
  return [...emails];
}

async function findActiveSubscriptionForUser(
  stripe: Stripe,
  userId: string,
  profile: Record<string, unknown> | null,
  opts?: { authEmail?: string | null; checkoutEmail?: string | null }
): Promise<{ sub: Stripe.Subscription; customerId: string } | null> {
  const storedSubId =
    typeof profile?.stripe_subscription_id === "string" ? profile.stripe_subscription_id : null;
  if (storedSubId) {
    const sub = await retrievePaidSubscription(stripe, storedSubId);
    if (sub) {
      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? "";
      if (customerId) return { sub, customerId };
    }
  }

  const byMeta = await searchPaidSubscriptionByMetadata(stripe, userId);
  if (byMeta) {
    const customerId =
      typeof byMeta.customer === "string" ? byMeta.customer : byMeta.customer?.id ?? "";
    if (customerId) return { sub: byMeta, customerId };
  }

  let customerId =
    typeof profile?.stripe_customer_id === "string" ? profile.stripe_customer_id : null;

  const emails = collectLookupEmails(profile, opts);
  if (!customerId) {
    for (const email of emails) {
      const customers = await stripe.customers.list({ email, limit: 5 });
      customerId = customers.data[0]?.id ?? null;
      if (customerId) break;
    }
  }

  if (!customerId) {
    try {
      const found = await stripe.customers.search({
        query: `metadata['userId']:'${userId}'`,
        limit: 1,
      });
      customerId = found.data[0]?.id ?? null;
    } catch {
      /* ignore */
    }
  }

  if (customerId) {
    const list = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 20,
    });
    const sub = list.data.find((s) => isPaidSubscriptionStatus(s.status)) ?? null;
    if (sub) return { sub, customerId };
  }

  return null;
}

/** Pull active subscription from Stripe and write plan to profiles (webhook recovery). */
export async function syncStripeSubscriptionForUser(
  stripe: Stripe,
  userId: string,
  opts?: { authEmail?: string | null; checkoutEmail?: string | null }
): Promise<
  | { ok: true; plan: PlanId; billing: "monthly" | "yearly" }
  | { ok: false; error: string }
> {
  const admin = await adminClient();
  if (!admin) return { ok: false, error: "Server database not configured" };

  const { data: profile } = await admin
    .from("profiles")
    .select(
      "stripe_customer_id, stripe_subscription_id, email, contact_email, contact_email_pending"
    )
    .eq("id", userId)
    .maybeSingle();

  const found = await findActiveSubscriptionForUser(
    stripe,
    userId,
    (profile as Record<string, unknown> | null) ?? null,
    opts
  );

  if (!found) {
    const authEmail = opts?.authEmail ?? (typeof profile?.email === "string" ? profile.email : null);
    const hint = isInternalAuthEmail(authEmail)
      ? " Sign in with the same username you used when paying. If you paid with a different email, add it under Settings → Contact email, or try restore again after checkout."
      : " Make sure you're signed into the account that completed checkout.";
    return {
      ok: false,
      error: `No active Stripe subscription found for this Proveit account.${hint}`,
    };
  }

  const { sub, customerId } = found;
  const plan = resolvePlanFromSubscription(sub);
  if (plan !== "pro" && plan !== "premium") {
    return { ok: false, error: "Could not determine Pro or Premium from Stripe subscription." };
  }

  const priceId = priceIdFromSubscription(sub);
  const billing =
    sub.metadata?.billing === "yearly" || sub.metadata?.billing === "monthly"
      ? sub.metadata.billing
      : billingFromStripePriceId(priceId);

  const applied = await applyPaidPlan(userId, plan, billing, customerId, sub.id);
  if (!applied.ok) return applied;

  return { ok: true, plan, billing };
}

/** Ensure a Stripe customer exists and is linked before Checkout (metadata for later sync). */
export async function ensureStripeCustomerForCheckout(
  stripe: Stripe,
  userId: string,
  authEmail: string,
  existingCustomerId?: string | null,
  contactEmail?: string | null
): Promise<string> {
  const receiptEmail =
    contactEmail && !isInternalAuthEmail(contactEmail) ? contactEmail.trim().toLowerCase() : null;

  if (existingCustomerId) {
    await stripe.customers.update(existingCustomerId, {
      metadata: { userId },
      ...(receiptEmail ? { email: receiptEmail } : {}),
    });
    return existingCustomerId;
  }

  const customer = await stripe.customers.create({
    email: receiptEmail || authEmail,
    metadata: { userId },
  });
  return customer.id;
}
