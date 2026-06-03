import { addDays, format, startOfWeek, subWeeks } from "date-fns";
import type { Goal, GraceDayEvent, ProofSubmission } from "@/types";
import { extractCalendarDateKey, safeParseISO } from "@/lib/dateUtils";
import { countVerifiedInCalendarWeek } from "@/lib/goalDue";
import {
  getEffectiveQuotaForWeek,
  isNeutralSignupWeekMiss,
  isWeekBeforeGoalExisted,
} from "@/lib/goalSchedule";

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
  | "createdAt"
>;
type GoalProgressSubmission = Pick<ProofSubmission, "date" | "status">;
type GoalProgressGraceDay = Pick<GraceDayEvent, "goalId" | "weekStart">;

/**
 * Streak for all goals (daily and N×/week), counted in calendar weeks.
 *
 * - Current (in-progress) week only counts once the full weekly quota is met.
 * - Until then, completed past weeks remain visible so the streak does not
 *   reset early before the week is over.
 * - Past weeks count toward the streak only if the full times-per-week
 * - Prorated signup weeks only count when quota is met; a miss is neutral (no penalty).
 */
function getWeeklyQuotaStreak(
  goal: GoalProgressGoal,
  getSubmissionsForGoal: (id: string) => GoalProgressSubmission[],
  graceDays: GoalProgressGraceDay[] = [],
  minDateInclusive?: string
): number {
  const subsAll = getSubmissionsForGoal(goal.id).filter((s) => {
    if (s.status !== "verified") return false;
    if (!minDateInclusive) return true;
    const key = extractCalendarDateKey(s.date);
    return key != null && key >= minDateInclusive;
  });

  let streak = 0;
  const now = new Date();
  let weekCursor = startOfWeek(now, { weekStartsOn: 0 });

  const quotaForWeek = (ref: Date) => getEffectiveQuotaForWeek(goal as Goal, ref);
  const countForWeek = (ref: Date) => countVerifiedInCalendarWeek(subsAll, ref);
  const graceForWeek = (ref: Date) => {
    const key = format(startOfWeek(ref, { weekStartsOn: 0 }), "yyyy-MM-dd");
    return graceDays.filter((event) => event.goalId === goal.id && event.weekStart === key).length;
  };

  const metForWeek = (ref: Date) =>
    countForWeek(ref) + graceForWeek(ref) >= quotaForWeek(ref);

  if (metForWeek(weekCursor)) streak += 1;
  weekCursor = subWeeks(weekCursor, 1);

  while (true) {
    if (isWeekBeforeGoalExisted(goal as Goal, weekCursor)) break;
    const verified = countForWeek(weekCursor);
    if (isNeutralSignupWeekMiss(goal as Goal, weekCursor, verified)) {
      weekCursor = subWeeks(weekCursor, 1);
      if (streak > 520) break;
      continue;
    }
    if (verified + graceForWeek(weekCursor) < quotaForWeek(weekCursor)) break;
    streak += 1;
    weekCursor = subWeeks(weekCursor, 1);
    if (streak > 520) break;
  }

  return streak;
}

function getBaseGoalStreak(
  goal: GoalProgressGoal,
  getSubmissionsForGoal: (id: string) => GoalProgressSubmission[],
  graceDays: GoalProgressGraceDay[] = [],
  minDateInclusive?: string
): number {
  return getWeeklyQuotaStreak(goal, getSubmissionsForGoal, graceDays, minDateInclusive);
}

function getPostBreakMinDate(goal: GoalProgressGoal): string | undefined {
  if (!goal.breakStartedAt) return undefined;
  const parsed = safeParseISO(goal.breakStartedAt);
  if (!parsed) return undefined;
  return format(addDays(parsed, 1), "yyyy-MM-dd");
}

export function getGoalStreak(
  goal: GoalProgressGoal,
  getSubmissionsForGoal: (id: string) => GoalProgressSubmission[],
  graceDays: GoalProgressGraceDay[] = []
): number {
  const baseStreak = getBaseGoalStreak(goal, getSubmissionsForGoal, graceDays);
  const carryover = Math.max(0, goal.streakCarryover ?? 0);

  if (goal.isOnBreak) {
    const frozen = goal.breakStreakSnapshot;
    if (typeof frozen === "number" && Number.isFinite(frozen)) {
      return Math.max(0, frozen);
    }
    return carryover + baseStreak;
  }

  if (carryover > 0) {
    const postBreakBase = getBaseGoalStreak(
      goal,
      getSubmissionsForGoal,
      graceDays,
      getPostBreakMinDate(goal)
    );
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
