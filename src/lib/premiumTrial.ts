import type { PlanId } from "@/types";
import type { StoredUser } from "@/lib/store";
import { applyDevPremiumGrantIfNeeded } from "@/lib/accountAccess";

/** Trials are disabled — kept for legacy profile rows only. */
export const PREMIUM_TRIAL_DAYS = 7;

export function canStartPremiumTrial(): boolean {
  return false;
}

export function isPremiumTrialActive(): boolean {
  return false;
}

/** Clear legacy trial fields if an old profile still has an expired trial timestamp. */
export function expireLocalPremiumTrialIfNeeded(user: StoredUser): StoredUser {
  if (user.premiumTrialEndsAt == null) {
    return applyDevPremiumGrantIfNeeded(user);
  }
  if (Date.parse(user.premiumTrialEndsAt) > Date.now()) {
    return applyDevPremiumGrantIfNeeded({
      ...user,
      premiumTrialEndsAt: undefined,
      premiumTrialRevertPlan: undefined,
    });
  }
  const revert: PlanId = user.premiumTrialRevertPlan === "pro" ? "pro" : "free";
  return applyDevPremiumGrantIfNeeded({
    ...user,
    plan: revert,
    premiumTrialEndsAt: undefined,
    premiumTrialRevertPlan: undefined,
    planBilling: revert === "free" ? undefined : user.planBilling,
  });
}

export function trialEndsAtFromNowISO(): string {
  return new Date().toISOString();
}

export const trialEndsAtFromNow = trialEndsAtFromNowISO;
