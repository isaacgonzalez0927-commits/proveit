import type { Goal } from "@/types";
import { effectiveTimesPerWeek, spreadReminderDaysForTimesPerWeek } from "@/lib/goalSchedule";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** HH:mm for <input type="time" /> (strips seconds / odd DB formats). */
export function normalizeReminderTimeInput(value: string | undefined | null): string {
  if (value == null || typeof value !== "string") return "";
  const m = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return "";
  const h = Math.min(23, Math.max(0, Number.parseInt(m[1]!, 10)));
  const min = Math.min(59, Math.max(0, Number.parseInt(m[2]!, 10)));
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** Effective reminder days (0–6) from `timesPerWeek` (auto-spread); daily = all seven. */
export function getReminderDays(goal: Goal): number[] {
  if (goal.frequency === "daily") return [0, 1, 2, 3, 4, 5, 6];
  const tw = effectiveTimesPerWeek(goal);
  if (tw >= 7) return [0, 1, 2, 3, 4, 5, 6];
  return spreadReminderDaysForTimesPerWeek(tw);
}

function getDueDate(goal: Goal, now: Date): Date | null {
  const days = getReminderDays(goal);
  if (!days.includes(now.getDay())) return null;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getCurrentCycleDueDate(goal: Goal, now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Proof can be submitted any time until the end of the calendar day (local). */
function getWindowEnd(dueDate: Date): Date {
  const end = new Date(dueDate);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * True when the user should be asked to submit proof: daily = today, weekly = today is reminder day.
 */
export function isGoalDue(goal: Goal, now: Date = new Date()): boolean {
  if (goal.isOnBreak) return false;
  return getDueDate(goal, now) !== null;
}

/**
 * True when the user can submit proof: on a due day, from midnight through end of that calendar day.
 */
export function isWithinSubmissionWindow(goal: Goal, now: Date = new Date()): boolean {
  if (goal.isOnBreak) return false;
  const days = getReminderDays(goal);
  if (!days.includes(now.getDay())) return false;
  const dueDate = getCurrentCycleDueDate(goal, now);
  const windowEnd = getWindowEnd(dueDate);
  const dayStart = new Date(dueDate);
  dayStart.setHours(0, 0, 0, 0);
  return now >= dayStart && now <= windowEnd;
}

/**
 * Human-readable message when submissions are closed.
 * Returns null when within window (can submit).
 */
export function getSubmissionWindowMessage(
  goal: Goal,
  now: Date = new Date()
): string | null {
  if (goal.isOnBreak) return "This goal is on break.";
  if (isWithinSubmissionWindow(goal, now)) return null;
  const dueDate = getCurrentCycleDueDate(goal, now);
  const windowEnd = getWindowEnd(dueDate);

  if (now > windowEnd) {
    const days = getReminderDays(goal);
    if (days.length === 1) return `Closed for today (next: ${DAY_NAMES[days[0]!]})`;
    return "Closed for today.";
  }
  return "Submissions are not available right now.";
}

/**
 * Human-readable label for when goal is due (e.g. "Due Mon, Wed, Fri" or "Daily").
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
