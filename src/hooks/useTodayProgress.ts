"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { useApp } from "@/context/AppContext";
import { getGoalStreak, isGoalDoneInCurrentWindow } from "@/lib/goalProgress";
import { isGoalDue, isWithinSubmissionWindow } from "@/lib/goalDue";

export function useTodayProgress() {
  const { user, goals, getSubmissionsForGoal, graceDayEvents } = useApp();

  return useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const now = new Date();
    const active = goals.filter((g) => !g.archivedAt);

    const streaks = active.map((goal) =>
      getGoalStreak(goal, getSubmissionsForGoal, graceDayEvents)
    );
    const maxStreak = streaks.length ? Math.max(...streaks, 0) : 0;

    const dueToday = active.filter((g) => isGoalDue(g, now, getSubmissionsForGoal(g.id)));
    const doneToday = dueToday.filter((g) =>
      isGoalDoneInCurrentWindow(g, getSubmissionsForGoal, todayStr)
    ).length;

    const firstProveGoal =
      dueToday.find(
        (g) =>
          !g.isOnBreak &&
          !isGoalDoneInCurrentWindow(g, getSubmissionsForGoal, todayStr) &&
          isWithinSubmissionWindow(g, now, getSubmissionsForGoal(g.id))
      ) ??
      active.find(
        (g) =>
          !g.isOnBreak &&
          isWithinSubmissionWindow(g, now, getSubmissionsForGoal(g.id)) &&
          !isGoalDoneInCurrentWindow(g, getSubmissionsForGoal, todayStr)
      );

    const proveHref = firstProveGoal
      ? `/goals/submit?goalId=${firstProveGoal.id}`
      : "/dashboard#today-path";

    const progressRatio =
      dueToday.length === 0 ? 0 : Math.min(1, doneToday / dueToday.length);

    return {
      signedIn: Boolean(user),
      maxStreak,
      doneToday,
      dueToday: dueToday.length,
      progressRatio,
      proveHref,
      streakUnit: "week" as const,
    };
  }, [user, goals, getSubmissionsForGoal, graceDayEvents]);
}
