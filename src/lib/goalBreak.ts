import { eachDayOfInterval, format, max, min } from "date-fns";
import type { Goal } from "@/types";
import { safeParseISO } from "@/lib/dateUtils";

/** Pro: total calendar days on break per goal per calendar month (resets each month). */
export const PRO_BREAK_DAYS_PER_MONTH = 7;

/** @deprecated alias — was a per-session cap; Pro now uses monthly allowance. */
export const PRO_GOAL_BREAK_MAX_DAYS = PRO_BREAK_DAYS_PER_MONTH;

export function proBreakMonthKey(d: Date): string {
  return format(d, "yyyy-MM");
}

export function normalizeProBreakUsageByMonth(raw: unknown): Record<string, number> {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}$/.test(k)) continue;
    const n = typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
    if (n > 0) out[k] = n;
  }
  return pruneProBreakUsageByMonth(out);
}

function pruneProBreakUsageByMonth(u: Record<string, number>): Record<string, number> {
  const keys = Object.keys(u).sort();
  if (keys.length <= 6) return u;
  const next = { ...u };
  for (let i = 0; i < keys.length - 6; i++) delete next[keys[i]!];
  return next;
}

/** Add each calendar day in [sessionStart, sessionEnd] (inclusive) to per-month tallies. */
export function addBreakSessionToProUsage(
  usage: Record<string, number>,
  sessionStartIso: string,
  sessionEndIso: string
): Record<string, number> {
  const a = safeParseISO(sessionStartIso);
  const b = safeParseISO(sessionEndIso);
  if (!a || !b) return pruneProBreakUsageByMonth({ ...usage });
  const start = min([a, b]);
  const end = max([a, b]);
  const days = eachDayOfInterval({ start, end });
  const next = { ...usage };
  for (const day of days) {
    const key = format(day, "yyyy-MM");
    next[key] = (next[key] ?? 0) + 1;
  }
  return pruneProBreakUsageByMonth(next);
}

function countBreakSessionCalendarDaysInMonth(
  breakStartedAtIso: string,
  monthKey: string,
  through: Date
): number {
  const started = safeParseISO(breakStartedAtIso);
  if (!started) return 0;
  const a = min([started, through]);
  const b = max([started, through]);
  let n = 0;
  for (const day of eachDayOfInterval({ start: a, end: b })) {
    if (format(day, "yyyy-MM") === monthKey) n += 1;
  }
  return n;
}

type GoalBreakUsagePick = Pick<Goal, "isOnBreak" | "breakStartedAt" | "proBreakUsageByMonth">;

/**
 * Distinct calendar days this goal has been on break in `monthKey` (yyyy-MM):
 * completed sessions (in `proBreakUsageByMonth`) plus the active session through `now`.
 */
export function getProBreakDaysUsedInCalendarMonth(
  goal: GoalBreakUsagePick,
  monthKey: string,
  now: Date = new Date()
): number {
  const usage = goal.proBreakUsageByMonth ?? {};
  let total = usage[monthKey] ?? 0;
  if (goal.isOnBreak === true && goal.breakStartedAt) {
    total += countBreakSessionCalendarDaysInMonth(goal.breakStartedAt, monthKey, now);
  }
  return total;
}

/** Days already counted from completed breaks this month (active session not included). */
export function getProBreakCompletedDaysInCalendarMonth(goal: GoalBreakUsagePick, monthKey: string): number {
  return goal.proBreakUsageByMonth?.[monthKey] ?? 0;
}

/** When not on break, may start a new break if fewer than 7 break-days were used this month. */
export function canProStartGoalBreak(goal: GoalBreakUsagePick, now: Date = new Date()): boolean {
  if (goal.isOnBreak === true) return true;
  const monthKey = proBreakMonthKey(now);
  return getProBreakCompletedDaysInCalendarMonth(goal, monthKey) < PRO_BREAK_DAYS_PER_MONTH;
}

export function getBreakDurationDays(goal: Pick<Goal, "breakStartedAt">): number {
  if (!goal.breakStartedAt) return 0;
  const started = safeParseISO(goal.breakStartedAt);
  if (!started) return 0;
  return eachDayOfInterval({ start: started, end: new Date() }).length;
}

/**
 * Pro: auto-resume when this goal would exceed `PRO_BREAK_DAYS_PER_MONTH` calendar break-days
 * in the current month (> 7).
 */
export function isProBreakExpired(goal: Goal, planId: string | undefined, now: Date = new Date()): boolean {
  if (planId !== "pro") return false;
  if (!goal.isOnBreak) return false;
  const monthKey = proBreakMonthKey(now);
  return getProBreakDaysUsedInCalendarMonth(goal, monthKey, now) > PRO_BREAK_DAYS_PER_MONTH;
}
