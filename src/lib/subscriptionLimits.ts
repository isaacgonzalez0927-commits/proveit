import type { Goal, PlanId, User } from "@/types";
import { isPremiumTrialActive } from "@/lib/premiumTrial";

export const FREE_ACTIVE_REMINDER_LIMIT = 2;
export const PAID_ACTIVE_REMINDER_LIMIT = 5;
export const PRO_STREAK_SHIELD_BALANCE = 3;
export const TRIAL_STREAK_SHIELD_BALANCE = 3;
export const PREMIUM_STREAK_SHIELD_BALANCE = 7;
export const FREE_AI_VERIFICATIONS_PER_WEEK = 3;
export const TRIAL_AI_VERIFICATIONS_PER_WEEK = 25;
export const PRO_AI_VERIFICATIONS_PER_MONTH = 100;
export const PREMIUM_AI_VERIFICATIONS_PER_MONTH = 500;

export function isPaidLikePlan(userOrPlan: Pick<User, "plan" | "premiumTrialEndsAt"> | PlanId): boolean {
  if (typeof userOrPlan === "string") return userOrPlan === "pro" || userOrPlan === "premium";
  return userOrPlan.plan === "pro" || userOrPlan.plan === "premium" || isPremiumTrialActive(userOrPlan as User);
}

export function getActiveReminderLimit(userOrPlan: Pick<User, "plan" | "premiumTrialEndsAt"> | PlanId): number {
  return isPaidLikePlan(userOrPlan) ? PAID_ACTIVE_REMINDER_LIMIT : FREE_ACTIVE_REMINDER_LIMIT;
}

export function getGraceDayResetBalance(userOrPlan: Pick<User, "plan" | "premiumTrialEndsAt"> | PlanId): number {
  if (typeof userOrPlan !== "string" && isPremiumTrialActive(userOrPlan as User)) {
    return TRIAL_STREAK_SHIELD_BALANCE;
  }
  const plan = typeof userOrPlan === "string" ? userOrPlan : userOrPlan.plan;
  if (plan === "premium") return PREMIUM_STREAK_SHIELD_BALANCE;
  if (plan === "pro") return PRO_STREAK_SHIELD_BALANCE;
  return 0;
}

export function getAiVerificationLimit(userOrPlan: Pick<User, "plan" | "premiumTrialEndsAt"> | PlanId): number {
  if (typeof userOrPlan !== "string" && isPremiumTrialActive(userOrPlan as User)) {
    return TRIAL_AI_VERIFICATIONS_PER_WEEK;
  }
  const plan = typeof userOrPlan === "string" ? userOrPlan : userOrPlan.plan;
  if (plan === "premium") return PREMIUM_AI_VERIFICATIONS_PER_MONTH;
  if (plan === "pro") return PRO_AI_VERIFICATIONS_PER_MONTH;
  return FREE_AI_VERIFICATIONS_PER_WEEK;
}

export function getAiVerificationCycleKind(userOrPlan: Pick<User, "plan" | "premiumTrialEndsAt"> | PlanId): "week" | "month" {
  if (typeof userOrPlan !== "string" && isPremiumTrialActive(userOrPlan as User)) return "week";
  const plan = typeof userOrPlan === "string" ? userOrPlan : userOrPlan.plan;
  return plan === "free" ? "week" : "month";
}

export function goalHasReminder(goal: Pick<Goal, "reminderTime" | "archivedAt">): boolean {
  return !goal.archivedAt && Boolean(goal.reminderTime);
}

export function isReminderActive(goal: Pick<Goal, "reminderTime" | "reminderIsActive" | "archivedAt">): boolean {
  return goalHasReminder(goal) && goal.reminderIsActive !== false;
}

export function countActiveReminders(goals: Array<Pick<Goal, "reminderTime" | "reminderIsActive" | "archivedAt">>): number {
  return goals.filter(isReminderActive).length;
}

export function freezeRemindersBeyondLimit<T extends Pick<Goal, "reminderTime" | "reminderIsActive" | "createdAt" | "archivedAt">>(
  goals: T[],
  limit: number
): T[] {
  let activeSeen = 0;
  return [...goals]
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
    .map((goal) => {
      if (!goalHasReminder(goal)) return goal;
      activeSeen += 1;
      return {
        ...goal,
        reminderIsActive: activeSeen <= limit,
      };
    });
}

