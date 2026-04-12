import type { Goal, ProofSubmission } from "@/types";
import { effectiveTimesPerWeek, spreadReminderDaysForTimesPerWeek } from "@/lib/goalSchedule";
import { format, isSameWeek, parseISO } from "date-fns";

/** HH:mm for <input type="time" /> (strips seconds / odd DB formats). */
export function normalizeReminderTimeInput(value: string | undefined | null): string {
  if (value == null || typeof value !== "string") return "";
  const m = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return "";
  const h = Math.min(23, Math.max(0, Number.parseInt(m[1]!, 10)));
  const min = Math.min(59, Math.max(0, Number.parseInt(m[2]!, 10)));
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function parseSubmissionDate(date: string): Date | null {
  try {
    const d = parseISO(date);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/** Verified submissions whose `date` falls in the same calendar week as `weekReference` (week starts Sunday). */
export function countVerifiedInCalendarWeek(
  submissions: Pick<ProofSubmission, "date" | "status">[],
  weekReference: Date
): number {
  return submissions.filter((s) => {
    if (s.status !== "verified") return false;
    const d = parseSubmissionDate(s.date);
    return d ? isSameWeek(d, weekReference, { weekStartsOn: 0 }) : false;
  }).length;
}

export function hasVerifiedSubmissionOnDate(
  submissions: Pick<ProofSubmission, "date" | "status">[],
  dateStr: string
): boolean {
  return submissions.some((s) => s.status === "verified" && s.date === dateStr);
}

/**
 * Legacy spaced weekdays (still on goals for older rows). Submission timing does not use this.
 */
export function getReminderDays(goal: Goal): number[] {
  if (goal.frequency === "daily") return [0, 1, 2, 3, 4, 5, 6];
  const tw = effectiveTimesPerWeek(goal);
  if (tw >= 7) return [0, 1, 2, 3, 4, 5, 6];
  return spreadReminderDaysForTimesPerWeek(tw);
}

/**
 * True when the user may submit proof: any day of the week, at most one verified check-in per calendar day,
 * and at most `timesPerWeek` verified check-ins per calendar week (Sunday–Saturday).
 */
export function isWithinSubmissionWindow(
  goal: Goal,
  now: Date = new Date(),
  submissions: Pick<ProofSubmission, "date" | "status">[] = []
): boolean {
  if (goal.isOnBreak) return false;
  const todayStr = format(now, "yyyy-MM-dd");
  if (hasVerifiedSubmissionOnDate(submissions, todayStr)) return false;
  const tw = effectiveTimesPerWeek(goal);
  const weekCount = countVerifiedInCalendarWeek(submissions, now);
  return weekCount < tw;
}

/** True when a check-in is still available today (same rules as `isWithinSubmissionWindow`). */
export function isGoalDue(
  goal: Goal,
  now: Date = new Date(),
  submissions: Pick<ProofSubmission, "date" | "status">[] = []
): boolean {
  if (goal.isOnBreak) return false;
  return isWithinSubmissionWindow(goal, now, submissions);
}

/**
 * Human-readable message when submissions are closed.
 * Returns null when within window (can submit).
 */
export function getSubmissionWindowMessage(
  goal: Goal,
  now: Date = new Date(),
  submissions: Pick<ProofSubmission, "date" | "status">[] = []
): string | null {
  if (goal.isOnBreak) return "This goal is on break.";
  if (isWithinSubmissionWindow(goal, now, submissions)) return null;
  const todayStr = format(now, "yyyy-MM-dd");
  if (hasVerifiedSubmissionOnDate(submissions, todayStr)) {
    return "You already proved it today. One check-in per day.";
  }
  const tw = effectiveTimesPerWeek(goal);
  const weekCount = countVerifiedInCalendarWeek(submissions, now);
  if (weekCount >= tw) {
    return "You've finished this week's check-ins. Daily reminders continue — you can prove it again next week.";
  }
  return "Check-ins are not available right now.";
}

/**
 * Human-readable label for rhythm (not tied to specific weekdays).
 */
export function getNextDueLabel(goal: Goal): string {
  const tw = effectiveTimesPerWeek(goal);
  if (tw >= 7 || goal.frequency === "daily") return "Daily";
  return `${tw}× per week`;
}

/** Short cadence label for cards (matches getNextDueLabel). */
export function getDueDayName(goal: Goal): string {
  const tw = effectiveTimesPerWeek(goal);
  if (tw >= 7 || goal.frequency === "daily") return "Daily";
  return `${tw}× / week`;
}
