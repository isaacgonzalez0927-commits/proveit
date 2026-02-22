import { addDays, addWeeks, format, isThisWeek, startOfWeek, subWeeks } from "date-fns";
import type { Goal, ProofSubmission } from "@/types";
import { safeParseISO } from "@/lib/dateUtils";

type GoalProgressGoal = Pick<
  Goal,
  "id" | "frequency" | "isOnBreak" | "breakStreakSnapshot" | "streakCarryover" | "breakStartedAt"
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

  if (goal.frequency === "weekly") {
    const weekStarts = new Set(
      subs
        .map((s) => safeParseISO(s.date))
        .filter((d): d is Date => !!d)
        .map((d) => format(startOfWeek(d, { weekStartsOn: 0 }), "yyyy-MM-dd"))
    );

    let streak = 0;
    let cursor = startOfWeek(new Date(), { weekStartsOn: 0 });
    while (weekStarts.has(format(cursor, "yyyy-MM-dd"))) {
      streak += 1;
      cursor = subWeeks(cursor, 1);
    }
    return streak;
  }

  const dates = new Set(subs.map((s) => s.date));
  let streak = 0;
  const cursor = new Date();
  while (dates.has(format(cursor, "yyyy-MM-dd"))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function getPostBreakMinDate(goal: GoalProgressGoal): string | undefined {
  if (!goal.breakStartedAt) return undefined;
  const parsed = safeParseISO(goal.breakStartedAt);
  if (!parsed) return undefined;
  if (goal.frequency === "weekly") {
    const nextCycle = addWeeks(startOfWeek(parsed, { weekStartsOn: 0 }), 1);
    return format(nextCycle, "yyyy-MM-dd");
  }
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

export function isGoalDoneInCurrentWindow(
  goal: GoalProgressGoal,
  getSubmissionsForGoal: (id: string) => GoalProgressSubmission[],
  todayStr = format(new Date(), "yyyy-MM-dd")
): boolean {
  const subs = getSubmissionsForGoal(goal.id).filter((s) => s.status === "verified");

  if (goal.frequency === "daily") {
    return subs.some((s) => s.date === todayStr);
  }

  return subs.some((s) => {
    const d = safeParseISO(s.date);
    return !!d && isThisWeek(d);
  });
}
