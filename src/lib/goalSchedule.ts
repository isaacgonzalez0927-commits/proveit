import { getDay, isSameWeek, startOfWeek } from "date-fns";
import type { Goal, TimesPerWeek } from "@/types";
import { safeParseISO } from "@/lib/dateUtils";

export type GoalQuotaInput = Pick<
  Goal,
  "timesPerWeek" | "reminderDays" | "frequency" | "createdAt"
>;

/**
 * Spread N reminder days across the week (0=Sun … 6=Sat) without asking the user which days.
 * Used with `timesPerWeek` so due windows stay predictable.
 */
export function spreadReminderDaysForTimesPerWeek(n: number): number[] {
  if (!Number.isFinite(n) || n < 1) return [3];
  if (n >= 7) return [0, 1, 2, 3, 4, 5, 6];
  if (n === 1) return [3];
  const days: number[] = [];
  for (let i = 0; i < n; i++) {
    days.push(Math.min(6, Math.floor((i * 7) / n)));
  }
  return Array.from(new Set(days)).sort((a, b) => a - b);
}

export function effectiveTimesPerWeek(goal: Pick<Goal, "timesPerWeek" | "reminderDays" | "frequency">): TimesPerWeek {
  if (typeof goal.timesPerWeek === "number" && goal.timesPerWeek >= 1 && goal.timesPerWeek <= 7) {
    return goal.timesPerWeek as TimesPerWeek;
  }
  if (goal.frequency === "daily") return 7;
  const len = goal.reminderDays?.length ?? 0;
  if (len >= 1) return Math.min(7, len) as TimesPerWeek;
  return 1;
}

/** UI copy for the times-per-week control (rhythm + how check-ins work). */
export function timesPerWeekSummary(n: number): { headline: string; detailLine: string } {
  const tw = !Number.isFinite(n) || n < 1 ? 1 : n > 7 ? 7 : Math.round(n);
  let headline: string;
  if (tw >= 7) headline = "Daily check-ins";
  else if (tw === 1) headline = "Once a week";
  else if (tw === 2) headline = "Twice a week";
  else headline = `${tw}× per week`;

  const detailLine =
    tw >= 7
      ? "Daily reminder. One check-in per calendar day."
      : `Daily reminder. Up to ${tw} check-ins per calendar week (Sun–Sat), any days you choose, one per day.`;

  return { headline, detailLine };
}

/** Calendar days from goal creation through Saturday of that week (inclusive). */
export function signupWeekDaysAvailable(
  goal: GoalQuotaInput,
  weekReference: Date
): number {
  const created = safeParseISO(goal.createdAt);
  if (!created || !isGoalSignupWeek(goal, weekReference)) return 7;
  return Math.max(1, 7 - getDay(created));
}

/** True when `weekReference` is the same Sun–Sat week the goal was created. */
export function isGoalSignupWeek(goal: GoalQuotaInput, weekReference: Date): boolean {
  const created = safeParseISO(goal.createdAt);
  if (!created) return false;
  return isSameWeek(created, weekReference, { weekStartsOn: 0 });
}

/**
 * Weekly proof quota for a calendar week. Prorates on the goal's signup week only:
 * max(1, round(fullQuota × daysAvailable / 7)).
 */
export function getEffectiveQuotaForWeek(
  goal: GoalQuotaInput,
  weekReference: Date = new Date()
): number {
  const full = effectiveTimesPerWeek(goal);
  if (!isGoalSignupWeek(goal, weekReference)) return full;
  const daysAvailable = signupWeekDaysAvailable(goal, weekReference);
  if (daysAvailable >= 7) return full;
  return Math.max(1, Math.round((full * daysAvailable) / 7));
}

function weekElapsedFromSunday(dayOfWeek: number): number {
  return Math.max(1, dayOfWeek + 1) / 7;
}

/** Minimum verified count expected by end of today to stay on pace (signup-week aware). */
export function getExpectedVerifiedForWeek(goal: GoalQuotaInput, date: Date): number {
  const needed = getEffectiveQuotaForWeek(goal, date);
  if (needed <= 0) return 0;

  if (isGoalSignupWeek(goal, date)) {
    const created = safeParseISO(goal.createdAt);
    if (created) {
      const createdDay = getDay(created);
      const dayOfWeek = getDay(date);
      if (dayOfWeek < createdDay) return 0;
      const daysAvailable = signupWeekDaysAvailable(goal, date);
      const daysElapsed = Math.min(daysAvailable, dayOfWeek - createdDay + 1);
      return Math.floor((needed * daysElapsed) / daysAvailable);
    }
  }

  return Math.floor(needed * weekElapsedFromSunday(getDay(date)));
}

/** UI copy for the prorated first calendar week. */
export function shortWeekLabel(goal: GoalQuotaInput, date: Date = new Date()): string | null {
  if (!isGoalSignupWeek(goal, date)) return null;
  const created = safeParseISO(goal.createdAt);
  if (!created) return null;
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
  return `Short week — started ${names[getDay(created)]} · no penalty if you miss`;
}

/** Compact signup-week note for tight UI (dashboard cards). */
export function signupWeekDashboardNote(goal: GoalQuotaInput, date: Date = new Date()): string | null {
  if (!isProratedSignupWeek(goal, date)) return null;
  const created = safeParseISO(goal.createdAt);
  if (!created) return null;
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
  return `Short week (from ${names[getDay(created)]}) · miss OK`;
}

/** True when signup week is shorter than a full Sun–Sat week (goal created mid-week). */
export function isProratedSignupWeek(goal: GoalQuotaInput, weekReference: Date): boolean {
  if (!isGoalSignupWeek(goal, weekReference)) return false;
  return signupWeekDaysAvailable(goal, weekReference) < 7;
}

/** Whether verified submissions meet the effective quota for this week. */
export function isSignupWeekQuotaMet(
  goal: GoalQuotaInput,
  verifiedCount: number,
  weekReference: Date = new Date()
): boolean {
  return verifiedCount >= getEffectiveQuotaForWeek(goal, weekReference);
}

/** Ended prorated signup week with a miss — no streak/plant penalty (Phase 2). */
export function isNeutralSignupWeekMiss(
  goal: GoalQuotaInput,
  weekReference: Date,
  verifiedCount: number
): boolean {
  return (
    isProratedSignupWeek(goal, weekReference) &&
    !isSignupWeekQuotaMet(goal, verifiedCount, weekReference)
  );
}

/** Streak walk-back stops before the week the goal did not exist yet. */
export function isWeekBeforeGoalExisted(goal: GoalQuotaInput, weekReference: Date): boolean {
  const created = safeParseISO(goal.createdAt);
  if (!created) return false;
  const createdWeekStart = startOfWeek(created, { weekStartsOn: 0 });
  const refWeekStart = startOfWeek(weekReference, { weekStartsOn: 0 });
  return refWeekStart < createdWeekStart;
}
