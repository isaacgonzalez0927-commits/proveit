import { getDay } from "date-fns";
import type { Goal, GraceDayEvent, ProofSubmission } from "@/types";
import { countVerifiedInCalendarWeek } from "@/lib/goalDue";
import { effectiveTimesPerWeek } from "@/lib/goalSchedule";
import { hasGraceDayForGoalWeek, weekStartKey } from "@/lib/graceDays";
import type { GardenWeekContext } from "@/lib/gardenMeta";

export type PlantHealthState = "healthy" | "wilting" | "dead" | "shielded";

type SubmissionLike = Pick<ProofSubmission, "date" | "status">;
type GraceDayLike = Pick<GraceDayEvent, "goalId" | "weekStart">;

export type PlantHydration = {
  needed: number;
  verified: number;
  /** 0..1 — verified proofs vs weekly quota */
  progress: number;
  /** 0..1 — how far through the calendar week we are (Sun=0 … Sat=6) */
  weekElapsed: number;
  /** Minimum verified count expected by end of today to stay on pace */
  expectedByToday: number;
  /** true when verified count meets or exceeds pace for this day */
  onPace: boolean;
  state: PlantHealthState;
  baseState: PlantHealthState;
  recoveryActive: boolean;
  inBloomSeason: boolean;
  perfectWeekStreak: number;
};

export type PlantHealthOptions = {
  recoveryActive?: boolean;
};

function weekElapsedRatio(dayOfWeek: number): number {
  return Math.max(1, dayOfWeek + 1) / 7;
}

function expectedVerifiedByToday(needed: number, dayOfWeek: number): number {
  if (needed <= 0) return 0;
  return Math.floor(needed * weekElapsedRatio(dayOfWeek));
}

/** Recovery week: no instant death; first verified proof restores normal pacing. */
export function applyRecoveryWeekCap(
  state: PlantHealthState,
  recoveryActive: boolean,
  verified: number
): PlantHealthState {
  if (!recoveryActive || state === "shielded") return state;
  if (verified === 0) return "wilting";
  if (state === "dead") return "wilting";
  return state;
}

function computeBaseWeeklyPlantState(
  goal: Pick<Goal, "id" | "frequency" | "timesPerWeek" | "archivedAt">,
  submissions: SubmissionLike[],
  graceDays: GraceDayLike[],
  now: Date
): PlantHealthState {
  if (goal.archivedAt) return "dead";
  const weekStart = weekStartKey(now);
  if (hasGraceDayForGoalWeek(graceDays, goal.id, weekStart)) return "shielded";

  const needed = effectiveTimesPerWeek(goal as Goal);
  const uploaded = countVerifiedInCalendarWeek(submissions, now);
  const dayOfWeek = getDay(now);

  if (dayOfWeek === 6 && uploaded < needed) return "dead";
  if (uploaded >= needed) return "healthy";

  const expected = expectedVerifiedByToday(needed, dayOfWeek);
  if (uploaded >= expected) return "healthy";

  if (dayOfWeek >= 5 && uploaded === 0) return "wilting";
  if (dayOfWeek >= 4 && uploaded === 0 && needed >= 2) return "wilting";
  if (dayOfWeek >= 4 && uploaded < expected) return "wilting";

  return "healthy";
}

/**
 * Weekly plant health — softer than v1: early-week lag stays healthy; wilt appears later.
 */
export function getWeeklyPlantState(
  goal: Pick<Goal, "id" | "frequency" | "timesPerWeek" | "archivedAt">,
  submissions: SubmissionLike[],
  graceDays: GraceDayLike[] = [],
  now: Date = new Date(),
  options?: PlantHealthOptions
): PlantHealthState {
  const base = computeBaseWeeklyPlantState(goal, submissions, graceDays, now);
  const uploaded = countVerifiedInCalendarWeek(submissions, now);
  return applyRecoveryWeekCap(base, Boolean(options?.recoveryActive), uploaded);
}

export function getPlantHydration(
  goal: Pick<Goal, "id" | "frequency" | "timesPerWeek" | "archivedAt">,
  submissions: SubmissionLike[],
  graceDays: GraceDayLike[] = [],
  now: Date = new Date(),
  gardenContext?: GardenWeekContext
): PlantHydration {
  const needed = effectiveTimesPerWeek(goal as Goal);
  const verified = countVerifiedInCalendarWeek(submissions, now);
  const dayOfWeek = getDay(now);
  const weekElapsed = weekElapsedRatio(dayOfWeek);
  const progress = needed <= 0 ? 1 : Math.min(1, verified / needed);
  const expectedByToday = expectedVerifiedByToday(needed, dayOfWeek);
  const onPace = needed <= 0 || verified >= needed || verified >= expectedByToday;
  const recoveryActive = gardenContext?.recoveryActive ?? false;
  const baseState = computeBaseWeeklyPlantState(goal, submissions, graceDays, now);
  const state = applyRecoveryWeekCap(baseState, recoveryActive, verified);

  return {
    needed,
    verified,
    progress,
    weekElapsed,
    expectedByToday,
    onPace,
    state,
    baseState,
    recoveryActive,
    inBloomSeason: gardenContext?.inBloomSeason ?? false,
    perfectWeekStreak: gardenContext?.perfectWeekStreak ?? 0,
  };
}

export function plantWateringLevelForState(state: PlantHealthState): number {
  if (state === "healthy" || state === "shielded") return 1;
  if (state === "wilting") return 0.35;
  return 0.12;
}

/** Visual hydration from weekly progress + health (not hardcoded to 1). */
export function resolvePlantWateringLevel(
  hydration: PlantHydration,
  wateredThisCycle: boolean
): number {
  if (wateredThisCycle) return 1;
  if (hydration.state === "shielded") return 0.9;
  const stateFloor = plantWateringLevelForState(hydration.state);
  const paceLevel = 0.28 + hydration.progress * 0.72;
  return Math.min(1, Math.max(stateFloor, paceLevel));
}

export function gardenHealthLabel(state: PlantHealthState, recoveryActive = false): string {
  if (recoveryActive && state === "wilting") return "Recovery week";
  switch (state) {
    case "healthy":
      return "Thriving";
    case "shielded":
      return "Shielded";
    case "wilting":
      return "Needs water";
    case "dead":
      return "Wilted";
    default:
      return "";
  }
}
