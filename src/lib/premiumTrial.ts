import type { PlanId } from "@/types";
import type { StoredUser } from "@/lib/store";

export const PREMIUM_TRIAL_DAYS = 7;

export function canStartPremiumTrial(
  u: Pick<StoredUser, "plan" | "premiumTrialUsed"> | null | undefined
): boolean {
  if (!u) return false;
  if (u.plan === "premium") return false;
  return !u.premiumTrialUsed;
}

export function isPremiumTrialActive(
  u: Pick<StoredUser, "plan" | "premiumTrialEndsAt">
): boolean {
  if (u.plan !== "premium" || !u.premiumTrialEndsAt) return false;
  return Date.parse(u.premiumTrialEndsAt) > Date.now();
}

/** After trial expiry, restore prior tier (local / demo mode). */
export function expireLocalPremiumTrialIfNeeded(user: StoredUser): StoredUser {
  if (user.plan !== "premium" || !user.premiumTrialEndsAt) return user;
  if (Date.parse(user.premiumTrialEndsAt) > Date.now()) return user;
  const revert: PlanId = user.premiumTrialRevertPlan === "pro" ? "pro" : "free";
  return {
    ...user,
    plan: revert,
    premiumTrialEndsAt: undefined,
    premiumTrialRevertPlan: undefined,
    planBilling: revert === "free" ? undefined : user.planBilling,
  };
}

export function trialEndsAtFromNowISO(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + PREMIUM_TRIAL_DAYS);
  return d.toISOString();
}

export const trialEndsAtFromNow = trialEndsAtFromNowISO;
