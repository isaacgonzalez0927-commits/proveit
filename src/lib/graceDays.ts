import { format, startOfWeek } from "date-fns";
import type { GraceDayEvent, Goal, ProofSubmission } from "@/types";
import { countVerifiedInCalendarWeek } from "@/lib/goalDue";
import { effectiveTimesPerWeek } from "@/lib/goalSchedule";

export type GraceDayLike = Pick<GraceDayEvent, "goalId" | "weekStart" | "missedDate">;
type SubmissionLike = Pick<ProofSubmission, "date" | "status">;

export function weekStartKey(date: Date = new Date()): string {
  return format(startOfWeek(date, { weekStartsOn: 0 }), "yyyy-MM-dd");
}

export function getGraceDaysForGoalWeek(
  events: GraceDayLike[],
  goalId: string,
  weekStart = weekStartKey()
): GraceDayLike[] {
  return events.filter((event) => event.goalId === goalId && event.weekStart === weekStart);
}

export function hasGraceDayForGoalWeek(
  events: GraceDayLike[],
  goalId: string,
  weekStart = weekStartKey()
): boolean {
  return getGraceDaysForGoalWeek(events, goalId, weekStart).length > 0;
}

export function weeklyQuotaMetWithGrace(
  goal: Pick<Goal, "id" | "frequency" | "timesPerWeek">,
  submissions: SubmissionLike[],
  events: GraceDayLike[],
  date = new Date()
): boolean {
  const needed = effectiveTimesPerWeek(goal as Goal);
  const verified = countVerifiedInCalendarWeek(submissions, date);
  const grace = getGraceDaysForGoalWeek(events, goal.id, weekStartKey(date)).length;
  return verified + grace >= needed;
}

