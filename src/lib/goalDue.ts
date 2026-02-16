import type { Goal } from "@/types";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * True when the user should be asked to submit proof: daily = today, weekly = today is reminder day.
 */
export function isGoalDue(goal: Goal, now: Date = new Date()): boolean {
  if (goal.frequency === "daily") return true;
  const day = typeof goal.reminderDay === "number" ? goal.reminderDay : 0;
  return now.getDay() === day;
}

/**
 * True when the user can submit proof: any time on the due day.
 */
export function isWithinSubmissionWindow(goal: Goal, now: Date = new Date()): boolean {
  return isGoalDue(goal, now);
}

/**
 * Human-readable message when submissions are closed.
 * Returns null when within window (can submit).
 */
export function getSubmissionWindowMessage(
  goal: Goal,
  now: Date = new Date()
): string | null {
  if (isWithinSubmissionWindow(goal, now)) return null;
  return null; // Not due day - use getNextDueLabel elsewhere
}

/**
 * Human-readable "Due [Day]" for weekly goals when not due; empty for daily.
 */
export function getNextDueLabel(goal: Goal): string {
  if (goal.frequency === "daily") return "";
  const day = typeof goal.reminderDay === "number" ? goal.reminderDay : 0;
  return `Due ${DAY_NAMES[day]}`;
}

/** Day name only for weekly goals (e.g. "Saturday"); empty for daily. */
export function getDueDayName(goal: Goal): string {
  if (goal.frequency === "daily") return "";
  const day = typeof goal.reminderDay === "number" ? goal.reminderDay : 0;
  return DAY_NAMES[day];
}
