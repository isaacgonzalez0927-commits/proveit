import { getDay } from "date-fns";
import type { Goal, GraceDayEvent, ProofSubmission } from "@/types";
import { countVerifiedInCalendarWeek } from "@/lib/goalDue";
import { getEffectiveQuotaForWeek, getExpectedVerifiedForWeek, isProratedSignupWeek, shortWeekLabel } from "@/lib/goalSchedule";
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
  /** Set on the goal's first calendar week when quota is prorated. */
  shortWeekLabel: string | null;
  /** Prorated signup week where quota was missed — capped wilt, no death. */
  signupWeekNoPenalty: boolean;
};

export type PlantHealthOptions = {
  recoveryActive?: boolean;
};


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
  goal: Pick<Goal, "id" | "frequency" | "timesPerWeek" | "archivedAt" | "createdAt">,
  submissions: SubmissionLike[],
  graceDays: GraceDayLike[],
  now: Date
): PlantHealthState {
  if (goal.archivedAt) return "dead";
  const weekStart = weekStartKey(now);
  if (hasGraceDayForGoalWeek(graceDays, goal.id, weekStart)) return "shielded";

  const needed = getEffectiveQuotaForWeek(goal, now);
  const uploaded = countVerifiedInCalendarWeek(submissions, now);
  const dayOfWeek = getDay(now);

  if (dayOfWeek === 6 && uploaded < needed) {
    if (isProratedSignupWeek(goal, now)) return "wilting";
    return "dead";
  }
  if (uploaded >= needed) return "healthy";

  const expected = getExpectedVerifiedForWeek(goal, now);
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
  goal: Pick<Goal, "id" | "frequency" | "timesPerWeek" | "archivedAt" | "createdAt">,
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
  goal: Pick<Goal, "id" | "frequency" | "timesPerWeek" | "archivedAt" | "createdAt">,
  submissions: SubmissionLike[],
  graceDays: GraceDayLike[] = [],
  now: Date = new Date(),
  gardenContext?: GardenWeekContext
): PlantHydration {
  const needed = getEffectiveQuotaForWeek(goal, now);
  const verified = countVerifiedInCalendarWeek(submissions, now);
  const dayOfWeek = getDay(now);
  const weekElapsed = Math.max(1, dayOfWeek + 1) / 7;
  const progress = needed <= 0 ? 1 : Math.min(1, verified / needed);
  const expectedByToday = getExpectedVerifiedForWeek(goal, now);
  const onPace = needed <= 0 || verified >= needed || verified >= expectedByToday;
  const recoveryActive = gardenContext?.recoveryActive ?? false;
  const baseState = computeBaseWeeklyPlantState(goal, submissions, graceDays, now);
  const state = applyRecoveryWeekCap(baseState, recoveryActive, verified);

  const signupWeekNoPenalty =
    isProratedSignupWeek(goal, now) && state !== "healthy" && state !== "shielded" && verified < needed;

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
    shortWeekLabel: shortWeekLabel(goal, now),
    signupWeekNoPenalty,
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

export function gardenHealthLabel(
  state: PlantHealthState,
  recoveryActive = false,
  signupWeekMiss = false
): string {
  if (signupWeekMiss && state === "wilting") return "Welcome week — no penalty";
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
