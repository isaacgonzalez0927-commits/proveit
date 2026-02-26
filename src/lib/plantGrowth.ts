import type { PlantStageKey } from "@/components/PlantIllustration";

export interface PlantGrowthStage {
  minStreak: number;
  stage: PlantStageKey;
  name: string;
}

/** Generic names that work for any plant style (including cactus). */
export const PLANT_GROWTH_STAGES: PlantGrowthStage[] = [
  { minStreak: 0, stage: "seedling", name: "Just planted" },
  { minStreak: 7, stage: "sprout", name: "Sprouting" },
  { minStreak: 14, stage: "leafy", name: "Growing" },
  { minStreak: 30, stage: "blooming", name: "Flourishing" },
  { minStreak: 60, stage: "thriving", name: "Thriving" },
  { minStreak: 100, stage: "flowering", name: "Fully grown" },
];

export function getPlantStageForStreak(streak: number): PlantGrowthStage {
  let result = PLANT_GROWTH_STAGES[0];
  for (const s of PLANT_GROWTH_STAGES) {
    if (streak >= s.minStreak) result = s;
  }
  return result;
}
