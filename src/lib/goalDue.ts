import type { Goal, GracePeriod } from "@/types";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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
  if (goal.frequency === "daily") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  const day = typeof goal.reminderDay === "number" ? goal.reminderDay : 0;
  if (now.getDay() !== day) return null;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getCurrentCycleDueDate(goal: Goal, now: Date): Date {
  if (goal.frequency === "daily") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  const day = typeof goal.reminderDay === "number" ? goal.reminderDay : 0;
  const dueDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayDelta = day - now.getDay();
  dueDate.setDate(dueDate.getDate() + dayDelta);
  return dueDate;
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
  return getDueDate(goal, now) !== null;
}

/**
 * True when the user can submit proof any time before the due deadline:
 * - daily: from start of day until grace deadline
 * - weekly: from start of current week until grace deadline on due day
 */
export function isWithinSubmissionWindow(goal: Goal, now: Date = new Date()): boolean {
  const dueDate = getCurrentCycleDueDate(goal, now);
  const windowEnd = getWindowEnd(dueDate, goal.reminderTime, goal.gracePeriod);
  if (goal.frequency === "daily") {
    const dayStart = new Date(dueDate);
    dayStart.setHours(0, 0, 0, 0);
    return now >= dayStart && now <= windowEnd;
  }

  const weekStart = getWeeklyCycleStart(now);
  return now >= weekStart && now <= windowEnd;
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
  const dueDate = getCurrentCycleDueDate(goal, now);
  const windowEnd = getWindowEnd(dueDate, goal.reminderTime, goal.gracePeriod);

  if (now > windowEnd) {
    if (goal.frequency === "weekly") {
      const day = typeof goal.reminderDay === "number" ? goal.reminderDay : 0;
      return `Closed for this week (until next ${DAY_NAMES[day]})`;
    }
    return "Closed for today";
  }
  return "Submissions are not available right now.";
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
