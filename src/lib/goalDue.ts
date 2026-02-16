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
 * True when the user can submit proof within the grace period after due time.
 */
export function isWithinSubmissionWindow(goal: Goal, now: Date = new Date()): boolean {
  const dueDate = getDueDate(goal, now);
  if (!dueDate) return false;

  const { hour, minute } = parseTime(goal.reminderTime, 9, 0);
  const windowStart = new Date(dueDate);
  windowStart.setHours(hour, minute, 0, 0);

  const windowEnd = getWindowEnd(dueDate, goal.reminderTime, goal.gracePeriod);

  return now >= windowStart && now <= windowEnd;
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
  const dueDate = getDueDate(goal, now);
  if (!dueDate) return null;

  const { hour, minute } = parseTime(goal.reminderTime, 9, 0);
  const windowStart = new Date(dueDate);
  windowStart.setHours(hour, minute, 0, 0);

  if (now < windowStart) {
    return `Opens at ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  const windowEnd = getWindowEnd(dueDate, goal.reminderTime, goal.gracePeriod);
  const endH = windowEnd.getHours();
  const endM = windowEnd.getMinutes();
  return `Closed (until ${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")})`;
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
