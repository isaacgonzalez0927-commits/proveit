import type { Goal, PlanId, User } from "@/types";
import { PLANS } from "@/types";

export const FREE_ACTIVE_REMINDER_LIMIT = 2;
export const PAID_ACTIVE_REMINDER_LIMIT = 5;
export const PRO_STREAK_SHIELD_BALANCE = 1;
export const PREMIUM_STREAK_SHIELD_BALANCE = 1;

/** Historical free-tier photo-verification constant (display/docs). Verification itself is unlimited. */
export const FREE_AI_VERIFICATIONS_PER_WEEK = 3;
export const PRO_AI_VERIFICATIONS_PER_MONTH = 100;
export const PREMIUM_AI_VERIFICATIONS_PER_MONTH = 500;

/** Free: no AI Coach (Gardener's Note / photo verify stays unlimited). */
export const FREE_AI_COACH_USES_PER_WEEK = 0;
/** Pro: 5 AI Coach uses per UTC week. */
export const PRO_AI_COACH_USES_PER_WEEK = 5;
/** Premium: 20 AI Coach uses per UTC week. */
export const PREMIUM_AI_COACH_USES_PER_WEEK = 20;

export function getMaxGoalsForPlan(plan: PlanId): number {
  const match = PLANS.find((p) => p.id === plan);
  if (!match || match.maxGoals === -1) return 999;
  return match.maxGoals;
}

export function isPaidLikePlan(userOrPlan: Pick<User, "plan"> | PlanId): boolean {
  const plan = typeof userOrPlan === "string" ? userOrPlan : userOrPlan.plan;
  return plan === "pro" || plan === "premium";
}

export function getActiveReminderLimit(userOrPlan: Pick<User, "plan"> | PlanId): number {
  return isPaidLikePlan(userOrPlan) ? PAID_ACTIVE_REMINDER_LIMIT : FREE_ACTIVE_REMINDER_LIMIT;
}

export function getGraceDayResetBalance(userOrPlan: Pick<User, "plan"> | PlanId): number {
  const plan = typeof userOrPlan === "string" ? userOrPlan : userOrPlan.plan;
  if (plan === "premium") return PREMIUM_STREAK_SHIELD_BALANCE;
  if (plan === "pro") return PRO_STREAK_SHIELD_BALANCE;
  return 0;
}

/**
 * Photo verification / Gardener's Note generation — unlimited for all plans.
 * (Not the same product as AI Coach.)
 */
export function getAiVerificationLimit(_userOrPlan: Pick<User, "plan"> | PlanId): number {
  return Number.MAX_SAFE_INTEGER;
}

/** Legacy cycle kind for verification counters (unused while verification is unlimited). */
export function getAiVerificationCycleKind(userOrPlan: Pick<User, "plan"> | PlanId): "week" | "month" {
  const plan = typeof userOrPlan === "string" ? userOrPlan : userOrPlan.plan;
  return plan === "free" ? "week" : "month";
}

/** Weekly AI Coach cap by plan (UTC week). Free = 0. */
export function getAiCoachLimit(userOrPlan: Pick<User, "plan"> | PlanId): number {
  const plan = typeof userOrPlan === "string" ? userOrPlan : userOrPlan.plan;
  if (plan === "premium") return PREMIUM_AI_COACH_USES_PER_WEEK;
  if (plan === "pro") return PRO_AI_COACH_USES_PER_WEEK;
  return FREE_AI_COACH_USES_PER_WEEK;
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
