export const GOAL_PLANT_VARIANTS = [1, 2, 3, 4] as const;
export type GoalPlantVariant = (typeof GOAL_PLANT_VARIANTS)[number];
export const GOAL_PLANT_VARIANT_NAMES: Record<GoalPlantVariant, string> = {
  1: "Fern",
  2: "Ivy",
  3: "Poppy",
  4: "Daisy",
};

const STORAGE_KEY = "proveit_goal_plants";

function normalizeVariant(value: unknown): GoalPlantVariant | null {
  if (value === 1 || value === 2 || value === 3 || value === 4) return value;
  if (value === "1" || value === "2" || value === "3" || value === "4") {
    return Number(value) as GoalPlantVariant;
  }
  return null;
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

export function getGoalPlantVariantName(variant: GoalPlantVariant): string {
  return GOAL_PLANT_VARIANT_NAMES[variant];
}
