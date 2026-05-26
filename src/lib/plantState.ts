import { getDay, startOfWeek } from "date-fns";
import type { Goal, GraceDayEvent, ProofSubmission } from "@/types";
import { countVerifiedInCalendarWeek } from "@/lib/goalDue";
import { effectiveTimesPerWeek } from "@/lib/goalSchedule";
import { hasGraceDayForGoalWeek, weekStartKey } from "@/lib/graceDays";

export type PlantHealthState = "healthy" | "wilting" | "dead" | "shielded";

type SubmissionLike = Pick<ProofSubmission, "date" | "status">;
type GraceDayLike = Pick<GraceDayEvent, "goalId" | "weekStart">;

export function getWeeklyPlantState(
  goal: Pick<Goal, "id" | "frequency" | "timesPerWeek" | "archivedAt">,
  submissions: SubmissionLike[],
  graceDays: GraceDayLike[] = [],
  now: Date = new Date()
): PlantHealthState {
  if (goal.archivedAt) return "dead";
  const weekStart = weekStartKey(now);
  if (hasGraceDayForGoalWeek(graceDays, goal.id, weekStart)) return "shielded";

  const needed = effectiveTimesPerWeek(goal as Goal);
  const uploaded = countVerifiedInCalendarWeek(submissions, now);
  const dayOfWeek = getDay(now); // 0 = Sunday, 6 = Saturday
  const elapsedRatio = Math.max(1, dayOfWeek + 1) / 7;
  const uploadRatio = needed <= 0 ? 1 : uploaded / needed;

  if (dayOfWeek === 6 && uploaded < needed) return "dead";
  if (dayOfWeek >= 4 && uploaded === 0) return "wilting";
  return elapsedRatio <= uploadRatio || uploaded >= needed ? "healthy" : "wilting";
}

export function plantWateringLevelForState(state: PlantHealthState): number {
  if (state === "healthy" || state === "shielded") return 1;
  if (state === "wilting") return 0.2;
  return 0.05;
}

