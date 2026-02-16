import type { Goal } from "@/types";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DEFAULT_DUE_TIME = "09:00"; // Used when reminderTime is not set
const SUBMISSION_WINDOW_MINUTES = 60;

/**
 * Parses "HH:mm" into hours and minutes.
 */
function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [h, m] = timeStr.split(":").map(Number);
  return { hours: Number.isNaN(h) ? 9 : h, minutes: Number.isNaN(m) ? 0 : m };
}

/**
 * Returns the exact moment when this goal instance is due.
 * Daily: today at reminderTime (default 09:00).
 * Weekly: today at reminderTime if today is reminderDay; otherwise null.
 */
export function getDueMoment(goal: Goal, now: Date = new Date()): Date | null {
  const timeStr = goal.reminderTime && /^\d{1,2}:\d{2}$/.test(goal.reminderTime)
    ? goal.reminderTime
    : DEFAULT_DUE_TIME;
  const { hours, minutes } = parseTime(timeStr);

  if (goal.frequency === "daily") {
    const due = new Date(now);
    due.setHours(hours, minutes, 0, 0);
    return due;
  }
  const day = typeof goal.reminderDay === "number" ? goal.reminderDay : 0;
  if (now.getDay() !== day) return null;
  const due = new Date(now);
  due.setHours(hours, minutes, 0, 0);
  return due;
}

/**
 * True when the user should be asked to submit proof: daily = today, weekly = today is reminder day.
 */
export function isGoalDue(goal: Goal, now: Date = new Date()): boolean {
  if (goal.frequency === "daily") return true;
  const day = typeof goal.reminderDay === "number" ? goal.reminderDay : 0;
  return now.getDay() === day;
}

/**
 * True when the user can submit proof: within 1 hour after the due time.
 * Must also be a due day (isGoalDue).
 */
export function isWithinSubmissionWindow(goal: Goal, now: Date = new Date()): boolean {
  if (!isGoalDue(goal, now)) return false;
  const due = getDueMoment(goal, now);
  if (!due) return false;
  const windowEnd = new Date(due.getTime() + SUBMISSION_WINDOW_MINUTES * 60 * 1000);
  return now >= due && now < windowEnd;
}

/**
 * Human-readable message for submission window status.
 * Returns null when within window (can submit).
 */
export function getSubmissionWindowMessage(
  goal: Goal,
  now: Date = new Date()
): string | null {
  if (isWithinSubmissionWindow(goal, now)) return null;
  if (!isGoalDue(goal, now)) return null; // Use getNextDueLabel elsewhere
  const due = getDueMoment(goal, now);
  if (!due) return null;
  const windowEnd = new Date(due.getTime() + SUBMISSION_WINDOW_MINUTES * 60 * 1000);
  const timeStr = goal.reminderTime && /^\d{1,2}:\d{2}$/.test(goal.reminderTime)
    ? goal.reminderTime
    : DEFAULT_DUE_TIME;
  if (now < due) {
    return `Submit between ${timeStr}–${windowEnd.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }
  return `Submissions closed. You had until ${windowEnd.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
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
