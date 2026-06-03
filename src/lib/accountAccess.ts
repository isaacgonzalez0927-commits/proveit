import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizePlanId, type PlanId } from "@/types";
import { getGraceDayResetBalance } from "@/lib/subscriptionLimits";
import { authEmailToUsername } from "@/lib/usernameAuth";

/** Complimentary plan for team / dev accounts (no Stripe required). */
export const DEV_GRANTED_PLAN: PlanId = "premium";

const CREATOR_EMAILS = new Set([
  "isaacgonzalez0927@gmail.com",
  "ranchdressing971@gmail.com",
]);

/** Username logins (yily@proveit.account.internal → yily) with complimentary Premium. */
const DEV_PREMIUM_USERNAMES = new Set(["yily"]);

const DEV_PREMIUM_INTERNAL_EMAILS = new Set([
  "yily@proveit.account.internal",
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

function hasDevPremiumUsername(email?: string | null): boolean {
  if (!email) return false;
  const lower = email.trim().toLowerCase();
  if (DEV_PREMIUM_INTERNAL_EMAILS.has(lower)) return true;
  const username = authEmailToUsername(lower);
  return username !== null && DEV_PREMIUM_USERNAMES.has(username);
}

/** Dev / team accounts receive complimentary Premium. */
export function hasDevPremiumAccess(
  email?: string | null,
  contactEmail?: string | null,
  authEmail?: string | null
): boolean {
  if (hasCreatorAccess(email, contactEmail)) return true;
  if (hasCreatorAccess(authEmail, null)) return true;
  if (hasDevPremiumUsername(email)) return true;
  if (hasDevPremiumUsername(contactEmail)) return true;
  if (hasDevPremiumUsername(authEmail)) return true;
  return false;
}

type ProfilePlanFields = {
  email?: string | null;
  contact_email?: string | null;
};

/** Plan used for entitlements — includes complimentary Premium for dev accounts. */
export function resolveEffectivePlanForAccount(
  storedPlan: unknown,
  profile?: ProfilePlanFields | null,
  authEmail?: string | null
): PlanId {
  if (
    hasDevPremiumAccess(profile?.email, profile?.contact_email, authEmail)
  ) {
    return DEV_GRANTED_PLAN;
  }
  return normalizePlanId(storedPlan);
}

type ProfilePlanRow = {
  email?: string | null;
  contact_email?: string | null;
  plan?: string | null;
};

type DevGrantUser = {
  email: string;
  contactEmail?: string | null;
  plan: PlanId;
  planBilling?: "monthly" | "yearly";
  premiumTrialEndsAt?: string | null;
  premiumTrialRevertPlan?: "free" | "pro";
};

/** Client-side: grant complimentary Premium and clear legacy trial fields. */
export function applyDevPremiumGrantIfNeeded<T extends DevGrantUser>(user: T): T {
  if (!hasDevPremiumAccess(user.email, user.contactEmail)) return user;
  const cleared =
    user.premiumTrialEndsAt != null || user.premiumTrialRevertPlan != null
      ? {
          ...user,
          premiumTrialEndsAt: undefined,
          premiumTrialRevertPlan: undefined,
        }
      : user;
  if (normalizePlanId(cleared.plan) === DEV_GRANTED_PLAN) return cleared;
  return {
    ...cleared,
    plan: DEV_GRANTED_PLAN,
    planBilling: cleared.planBilling ?? "yearly",
  };
}

/** Persist complimentary Premium for dev accounts (runs on profile load). */
export async function ensureDevAccountPremiumPlan(
  supabase: SupabaseClient,
  userId: string,
  profile: ProfilePlanRow,
  authEmail?: string | null
): Promise<boolean> {
  if (!hasDevPremiumAccess(profile.email, profile.contact_email, authEmail)) return false;

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
