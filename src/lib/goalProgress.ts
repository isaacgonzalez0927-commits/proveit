import { addDays, format, subDays, startOfWeek, subWeeks } from "date-fns";
import type { Goal, ProofSubmission } from "@/types";
import { extractCalendarDateKey, safeParseISO } from "@/lib/dateUtils";
import { countVerifiedInCalendarWeek } from "@/lib/goalDue";
import { effectiveTimesPerWeek } from "@/lib/goalSchedule";

type GoalProgressGoal = Pick<
  Goal,
  | "id"
  | "frequency"
  | "timesPerWeek"
  | "reminderDay"
  | "reminderDays"
  | "isOnBreak"
  | "breakStreakSnapshot"
  | "streakCarryover"
  | "breakStartedAt"
>;
type GoalProgressSubmission = Pick<ProofSubmission, "date" | "status">;

/** Consecutive calendar days (including today) with a verified submission. */
function getDailyCalendarStreak(
  goalId: string,
  getSubmissionsForGoal: (id: string) => GoalProgressSubmission[],
  minDateInclusive?: string
): number {
  const subs = getSubmissionsForGoal(goalId).filter((s) => {
    if (s.status !== "verified") return false;
    if (!minDateInclusive) return true;
    const key = extractCalendarDateKey(s.date);
    return key != null && key >= minDateInclusive;
  });
  const submittedDates = new Set(
    subs
      .map((s) => extractCalendarDateKey(s.date))
      .filter((k): k is string => k != null)
  );
  let streak = 0;
  let cursor = new Date();
  while (true) {
    const dateStr = format(cursor, "yyyy-MM-dd");
    if (!submittedDates.has(dateStr)) break;
    streak += 1;
    cursor = subDays(cursor, 1);
    if (cursor.getTime() < (minDateInclusive ? safeParseISO(minDateInclusive)?.getTime() ?? 0 : 0)) break;
    if (streak > 2000) break;
  }
  return streak;
}

/** Consecutive calendar weeks (Sunday-start) where verified count >= times-per-week target. */
function getWeeklyQuotaStreak(
  goal: GoalProgressGoal,
  getSubmissionsForGoal: (id: string) => GoalProgressSubmission[],
  minDateInclusive?: string
): number {
  const tw = effectiveTimesPerWeek(goal as Goal);
  const subsAll = getSubmissionsForGoal(goal.id).filter((s) => {
    if (s.status !== "verified") return false;
    if (!minDateInclusive) return true;
    const key = extractCalendarDateKey(s.date);
    return key != null && key >= minDateInclusive;
  });

  let streak = 0;
  const now = new Date();
  let weekCursor = startOfWeek(now, { weekStartsOn: 0 });

  const countForWeek = (ref: Date) => countVerifiedInCalendarWeek(subsAll, ref);

  if (countForWeek(weekCursor) >= tw) streak += 1;
  weekCursor = subWeeks(weekCursor, 1);

  while (true) {
    if (countForWeek(weekCursor) < tw) break;
    streak += 1;
    weekCursor = subWeeks(weekCursor, 1);
    if (streak > 520) break;
  }

  return streak;
}

function getBaseGoalStreak(
  goal: GoalProgressGoal,
  getSubmissionsForGoal: (id: string) => GoalProgressSubmission[],
  minDateInclusive?: string
): number {
  const tw = effectiveTimesPerWeek(goal as Goal);
  if (tw >= 7 || goal.frequency === "daily") {
    return getDailyCalendarStreak(goal.id, getSubmissionsForGoal, minDateInclusive);
  }
  return getWeeklyQuotaStreak(goal, getSubmissionsForGoal, minDateInclusive);
}

function getPostBreakMinDate(goal: GoalProgressGoal): string | undefined {
  if (!goal.breakStartedAt) return undefined;
  const parsed = safeParseISO(goal.breakStartedAt);
  if (!parsed) return undefined;
  return format(addDays(parsed, 1), "yyyy-MM-dd");
}

export function getGoalStreak(
  goal: GoalProgressGoal,
  getSubmissionsForGoal: (id: string) => GoalProgressSubmission[]
): number {
  const baseStreak = getBaseGoalStreak(goal, getSubmissionsForGoal);
  const carryover = Math.max(0, goal.streakCarryover ?? 0);

  if (goal.isOnBreak) {
    const frozen = goal.breakStreakSnapshot;
    if (typeof frozen === "number" && Number.isFinite(frozen)) {
      return Math.max(0, frozen);
    }
    return carryover + baseStreak;
  }

  if (carryover > 0) {
    const postBreakBase = getBaseGoalStreak(goal, getSubmissionsForGoal, getPostBreakMinDate(goal));
    return carryover + postBreakBase;
  }

  return baseStreak;
}

/** True if there is a verified submission for today (local calendar date). */
export function isGoalDoneInCurrentWindow(
  goal: GoalProgressGoal,
  getSubmissionsForGoal: (id: string) => GoalProgressSubmission[],
  todayStr = format(new Date(), "yyyy-MM-dd")
): boolean {
  const subs = getSubmissionsForGoal(goal.id).filter((s) => s.status === "verified");
  return subs.some((s) => extractCalendarDateKey(s.date) === todayStr);
}
