import { differenceInDays } from "date-fns";
import type { Goal } from "@/types";
import { safeParseISO } from "@/lib/dateUtils";

/** Pro plan: break can last up to 3 days. Premium: unlimited. */
export const PRO_GOAL_BREAK_MAX_DAYS = 3;

export function getBreakDurationDays(goal: Pick<Goal, "breakStartedAt">): number {
  if (!goal.breakStartedAt) return 0;
  const started = safeParseISO(goal.breakStartedAt);
  if (!started) return 0;
  return differenceInDays(new Date(), started);
}

/** True if user is on Pro and break has reached the 3-day limit. */
export function isProBreakExpired(goal: Goal, planId: string | undefined): boolean {
  if (planId !== "pro") return false;
  if (!goal.isOnBreak) return false;
  return getBreakDurationDays(goal) >= PRO_GOAL_BREAK_MAX_DAYS;
}
