import type { Goal, GracePeriod } from "@/types";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Effective reminder days (0–6). Daily = all 7; weekly = reminderDays or [reminderDay]. */
export function getReminderDays(goal: Goal): number[] {
  if (goal.frequency === "daily") return [0, 1, 2, 3, 4, 5, 6];
  if (goal.reminderDays && goal.reminderDays.length > 0) return goal.reminderDays;
  const d = typeof goal.reminderDay === "number" ? goal.reminderDay : 0;
  return [d];
}

const GRACE_HOURS: Record<Exclude<GracePeriod, "eod">, number> = {
  "1h": 1,
  "3h": 3,
  "6h": 6,
  "12h": 12,
};

function parseTime(hhmm: string | undefined, defaultH = 9, defaultM = 0): { hour: number; minute: number } {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return { hour: defaultH, minute: defaultM };
  const [h, m] = hhmm.split(":").map(Number);
  return { hour: h ?? defaultH, minute: m ?? defaultM };
}

function getDueDate(goal: Goal, now: Date): Date | null {
  const days = getReminderDays(goal);
  if (!days.includes(now.getDay())) return null;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getCurrentCycleDueDate(goal: Goal, now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getWeeklyCycleStart(now: Date): Date {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  return start;
}

function getWindowEnd(dueDate: Date, reminderTime: string | undefined, grace: GracePeriod | undefined): Date {
  const { hour, minute } = parseTime(reminderTime, 9, 0);
  const start = new Date(dueDate);
  start.setHours(hour, minute, 0, 0);

  const g = grace ?? "eod";
  if (g === "eod") {
    const end = new Date(dueDate);
    end.setHours(23, 59, 59, 999);
    return end;
  }
  const hours = GRACE_HOURS[g];
  const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
  const dayEnd = new Date(dueDate);
  dayEnd.setHours(23, 59, 59, 999);
  return end > dayEnd ? dayEnd : end;
}

/**
 * True when the user should be asked to submit proof: daily = today, weekly = today is reminder day.
 */
export function isGoalDue(goal: Goal, now: Date = new Date()): boolean {
  if (goal.isOnBreak) return false;
  return getDueDate(goal, now) !== null;
}

/**
 * True when the user can submit proof: from start of today until grace deadline on a reminder day.
 */
export function isWithinSubmissionWindow(goal: Goal, now: Date = new Date()): boolean {
  if (goal.isOnBreak) return false;
  const days = getReminderDays(goal);
  if (!days.includes(now.getDay())) return false;
  const dueDate = getCurrentCycleDueDate(goal, now);
  const windowEnd = getWindowEnd(dueDate, goal.reminderTime, goal.gracePeriod);
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
  const windowEnd = getWindowEnd(dueDate, goal.reminderTime, goal.gracePeriod);

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
  const days = getReminderDays(goal);
  if (days.length === 7) return "Daily";
  if (days.length === 0) return "";
  const names = days.map((d) => DAY_NAMES[d]!.slice(0, 3)).join(", ");
  return `Due ${names}`;
}

/** Day names for weekly goals (e.g. "Mon, Wed, Sat"); "Daily" for all 7. */
export function getDueDayName(goal: Goal): string {
  const days = getReminderDays(goal);
  if (days.length === 7) return "Daily";
  if (days.length === 0) return "";
  return days.map((d) => DAY_NAMES[d]!.slice(0, 3)).join(", ");
}
