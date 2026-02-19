import { format, isThisWeek, startOfWeek, subWeeks } from "date-fns";
import type { Goal, ProofSubmission } from "@/types";
import { safeParseISO } from "@/lib/dateUtils";

type GoalProgressGoal = Pick<Goal, "id" | "frequency">;
type GoalProgressSubmission = Pick<ProofSubmission, "date" | "status">;

export function getGoalStreak(
  goal: GoalProgressGoal,
  getSubmissionsForGoal: (id: string) => GoalProgressSubmission[]
): number {
  const subs = getSubmissionsForGoal(goal.id).filter((s) => s.status === "verified");

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
