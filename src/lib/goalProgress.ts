import { addDays, format, subDays } from "date-fns";
import type { Goal, ProofSubmission } from "@/types";
import { safeParseISO } from "@/lib/dateUtils";
import { getReminderDays } from "@/lib/goalDue";

type GoalProgressGoal = Pick<
  Goal,
  "id" | "frequency" | "reminderDay" | "reminderDays" | "isOnBreak" | "breakStreakSnapshot" | "streakCarryover" | "breakStartedAt"
>;
type GoalProgressSubmission = Pick<ProofSubmission, "date" | "status">;

function getBaseGoalStreak(
  goal: GoalProgressGoal,
  getSubmissionsForGoal: (id: string) => GoalProgressSubmission[],
  minDateInclusive?: string
): number {
  const subs = getSubmissionsForGoal(goal.id).filter((s) => {
    if (s.status !== "verified") return false;
    if (!minDateInclusive) return true;
    return s.date >= minDateInclusive;
  });
  const submittedDates = new Set(subs.map((s) => s.date));
  const reminderDays = getReminderDays(goal as Goal);

  // Consecutive reminder-days (going backwards from today) that have a submission.
  let streak = 0;
  let cursor = new Date();
  while (true) {
    const dateStr = format(cursor, "yyyy-MM-dd");
    const dayOfWeek = cursor.getDay();
    if (reminderDays.includes(dayOfWeek)) {
      if (!submittedDates.has(dateStr)) break;
      streak += 1;
    }
    cursor = subDays(cursor, 1);
    if (cursor.getTime() < (minDateInclusive ? safeParseISO(minDateInclusive)?.getTime() ?? 0 : 0)) break;
  }
  return streak;
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
    // Keep the streak from resetting after a break; new verified proofs grow on top.
    const postBreakBase = getBaseGoalStreak(goal, getSubmissionsForGoal, getPostBreakMinDate(goal));
    return carryover + postBreakBase;
  }

  return baseStreak;
}

/** True if there is a verified submission for today (current reminder day). */
export function isGoalDoneInCurrentWindow(
  goal: GoalProgressGoal,
  getSubmissionsForGoal: (id: string) => GoalProgressSubmission[],
  todayStr = format(new Date(), "yyyy-MM-dd")
): boolean {
  const subs = getSubmissionsForGoal(goal.id).filter((s) => s.status === "verified");
  return subs.some((s) => s.date === todayStr);
}
