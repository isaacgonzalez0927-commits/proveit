import type { PlantStageKey } from "@/components/PlantIllustration";

export interface PlantGrowthStage {
  minStreak: number;
  stage: PlantStageKey;
  name: string;
}

/** Generic names that work for any plant style (including cactus). */
export const PLANT_GROWTH_STAGES: PlantGrowthStage[] = [
  { minStreak: 0, stage: "seedling", name: "Just planted" },
  { minStreak: 1, stage: "sprout", name: "Week 1 sprout" },
  { minStreak: 2, stage: "leafy", name: "Consistent" },
  { minStreak: 4, stage: "blooming", name: "Month strong" },
  { minStreak: 8, stage: "thriving", name: "Deep roots" },
  { minStreak: 12, stage: "flowering", name: "Fully grown" },
];

/** Minimum streak on any goal to reach the final plant stage. */
export const FULLY_GROWN_MIN_STREAK =
  PLANT_GROWTH_STAGES[PLANT_GROWTH_STAGES.length - 1]!.minStreak;

export function isFullyGrownStreak(streak: number): boolean {
  return streak >= FULLY_GROWN_MIN_STREAK;
}

export function getPlantStageForStreak(streak: number): PlantGrowthStage {
  let result = PLANT_GROWTH_STAGES[0];
  for (const s of PLANT_GROWTH_STAGES) {
    if (streak >= s.minStreak) result = s;
  }
  return result;
}
