import type { Goal, GraceDayEvent, ProofSubmission, User } from "@/types";
import { format } from "date-fns";
import { isGoalDue, isWithinSubmissionWindow } from "@/lib/goalDue";
import { getGoalStreak, isGoalDoneInCurrentWindow } from "@/lib/goalProgress";
import type { WidgetSnapshot } from "@/lib/nativeWidgetBridge";

type SubmissionLookup = (goalId: string) => ProofSubmission[];

function todayKey(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function buildWidgetSnapshot(input: {
  user: User | null;
  goals: Goal[];
  getSubmissionsForGoal: SubmissionLookup;
  graceDayEvents: GraceDayEvent[];
}): WidgetSnapshot {
  const { user, goals, getSubmissionsForGoal, graceDayEvents } = input;
  const now = new Date();
  const today = todayKey();
  const activeGoals = goals.filter((g) => !g.archivedAt && !g.isOnBreak);

  if (!user) {
    return {
      updatedAt: new Date().toISOString(),
      signedIn: false,
      maxStreak: 0,
      topGoalTitle: "Open Proveit",
      topGoalStreak: 0,
      goalsDoneToday: 0,
      goalsDueToday: 0,
      gardenWatered: 0,
      gardenTotal: 0,
      streakUnit: "day",
    };
  }

  const streakEntries = activeGoals.map((goal) => ({
    goal,
    streak: getGoalStreak(goal, getSubmissionsForGoal, graceDayEvents),
  }));
  const top = streakEntries.sort((a, b) => b.streak - a.streak)[0];
  const maxStreak = top?.streak ?? 0;
  const streakUnit: WidgetSnapshot["streakUnit"] =
    top?.goal.frequency === "weekly" ? "week" : "day";

  const goalsDueToday = activeGoals.filter((goal) =>
    isGoalDue(goal, now, getSubmissionsForGoal(goal.id))
  );
  const goalsDoneToday = goalsDueToday.filter((goal) =>
    isGoalDoneInCurrentWindow(goal, getSubmissionsForGoal, today)
  ).length;

  const gardenWatered = activeGoals.filter((goal) => {
    const due = isGoalDue(goal, now, getSubmissionsForGoal(goal.id));
    const done = isGoalDoneInCurrentWindow(goal, getSubmissionsForGoal, today);
    return done || (!due && isWithinSubmissionWindow(goal, now));
  }).length;

  return {
    updatedAt: new Date().toISOString(),
    signedIn: true,
    maxStreak,
    topGoalTitle: top?.goal.title ?? "Your goals",
    topGoalStreak: top?.streak ?? 0,
    goalsDoneToday,
    goalsDueToday: goalsDueToday.length,
    gardenWatered,
    gardenTotal: activeGoals.length,
    streakUnit,
  };
}
