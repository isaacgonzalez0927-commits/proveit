import type { Goal, TimesPerWeek } from "@/types";

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
