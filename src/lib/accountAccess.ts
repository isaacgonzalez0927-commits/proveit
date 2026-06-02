import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizePlanId, type PlanId } from "@/types";
import { getGraceDayResetBalance } from "@/lib/subscriptionLimits";

/** Complimentary plan for team / dev accounts (no Stripe required). */
export const DEV_GRANTED_PLAN: PlanId = "premium";

const CREATOR_EMAILS = new Set([
  "isaacgonzalez0927@gmail.com",
  "ranchdressing971@gmail.com",
]);

/** Optional extra dev emails via env: DEV_PREMIUM_EMAILS=a@x.com,b@y.com */
function allDevEmails(): Set<string> {
  const extra = process.env.DEV_PREMIUM_EMAILS?.trim();
  const fromEnv = extra
    ? extra
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
    : [];
  return new Set([...CREATOR_EMAILS, ...fromEnv]);
}

export function hasCreatorAccess(
  email?: string | null,
  contactEmail?: string | null
): boolean {
  const allowed = allDevEmails();
  if (email && allowed.has(email.trim().toLowerCase())) return true;
  if (contactEmail && allowed.has(contactEmail.trim().toLowerCase())) return true;
  return false;
}

/** Dev / team accounts receive complimentary Premium. */
export function hasDevPremiumAccess(
  email?: string | null,
  contactEmail?: string | null
): boolean {
  return hasCreatorAccess(email, contactEmail);
}

type ProfilePlanRow = {
  email?: string | null;
  contact_email?: string | null;
  plan?: string | null;
};

/** Persist complimentary Premium for dev accounts (runs on profile load). */
export async function ensureDevAccountPremiumPlan(
  supabase: SupabaseClient,
  userId: string,
  profile: ProfilePlanRow
): Promise<boolean> {
  if (!hasDevPremiumAccess(profile.email, profile.contact_email)) return false;

  if (normalizePlanId(profile.plan) === DEV_GRANTED_PLAN) return false;

  const { error } = await supabase
    .from("profiles")
    .update({
      plan: DEV_GRANTED_PLAN,
      plan_billing: "yearly",
      grace_day_balance: getGraceDayResetBalance(DEV_GRANTED_PLAN),
      grace_day_cycle_anchor: new Date().toISOString(),
      premium_trial_ends_at: null,
      premium_trial_revert_plan: null,
      trial_expired_needs_review: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    console.error("ensureDevAccountPremiumPlan:", userId, error.message);
    return false;
  }
  return true;
}
