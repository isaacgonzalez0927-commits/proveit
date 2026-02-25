import type { PlanId } from "@/types";

export const GOAL_PLANT_VARIANTS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export type GoalPlantVariant = (typeof GOAL_PLANT_VARIANTS)[number];

/** Cactus variant is premium-only and has 5 growth stages (no stage-6 image). */
export const CACTUS_VARIANT: GoalPlantVariant = 5;

/** Strawberry variant; Pro gets this instead of cactus. */
export const STRAWBERRY_VARIANT: GoalPlantVariant = 7;

const STORAGE_KEY = "proveit_goal_plants";

/** Max image stage number for variant: cactus (5) has 5 stages; others have 6. */
export function getMaxStageForVariant(variant: GoalPlantVariant): 5 | 6 {
  return variant === CACTUS_VARIANT ? 5 : 6;
}

/** Stage number to use for image lookup; cactus uses stage 5 for both thriving and flowering. */
export function getImageStageForVariant(logicalStageNumber: number, variant: GoalPlantVariant): number {
  const max = getMaxStageForVariant(variant);
  return Math.min(logicalStageNumber, max);
}

/** Max plant style number allowed by plan: free=3, pro=7 (strawberry, no cactus), premium=8 */
export function getMaxPlantVariantForPlan(planId: PlanId): GoalPlantVariant {
  if (planId === "premium") return 8;
  if (planId === "pro") return 7;
  return 3;
}

/** Plant style variants available for the given plan (for picker UIs). Pro gets strawberry (7), not cactus (5). */
export function getPlantVariantsForPlan(planId: PlanId): GoalPlantVariant[] {
  const max = getMaxPlantVariantForPlan(planId);
  const variants = GOAL_PLANT_VARIANTS.filter((v) => v <= max) as GoalPlantVariant[];
  if (planId === "pro") return variants.filter((v) => v !== CACTUS_VARIANT);
  return variants;
}

/** Clamp a chosen variant to what the plan allows. Pro: 5 (cactus) → 7 (strawberry). */
export function clampVariantForPlan(raw: GoalPlantVariant, planId: PlanId): GoalPlantVariant {
  const allowed = getPlantVariantsForPlan(planId);
  if (allowed.includes(raw)) return raw;
  if (planId === "pro" && raw === CACTUS_VARIANT) return STRAWBERRY_VARIANT;
  const under = allowed.filter((v) => v <= raw);
  const over = allowed.filter((v) => v >= raw);
  if (under.length) return under[under.length - 1];
  return over[0];
}

function normalizeVariant(value: unknown): GoalPlantVariant | null {
  const n = typeof value === "string" ? parseInt(value, 10) : value;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > 8) return null;
  return n as GoalPlantVariant;
}

export function getDefaultGoalPlantVariant(goalId: string): GoalPlantVariant {
  let hash = 0;
  for (let i = 0; i < goalId.length; i += 1) {
    hash = (hash * 31 + goalId.charCodeAt(i)) >>> 0;
  }
  return (((hash % GOAL_PLANT_VARIANTS.length) + 1) as GoalPlantVariant);
}

export function getStoredGoalPlantSelections(): Record<string, GoalPlantVariant> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, GoalPlantVariant> = {};
    for (const [goalId, value] of Object.entries(parsed)) {
      const variant = normalizeVariant(value);
      if (variant) out[goalId] = variant;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveGoalPlantSelections(selections: Record<string, GoalPlantVariant>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(selections));
}

export function clearGoalPlantSelections() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
