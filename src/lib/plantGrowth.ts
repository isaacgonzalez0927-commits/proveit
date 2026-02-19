import type { PlantStageKey } from "@/components/PlantIllustration";

export interface PlantGrowthStage {
  minStreak: number;
  stage: PlantStageKey;
  name: string;
}

export const PLANT_GROWTH_STAGES: PlantGrowthStage[] = [
  { minStreak: 0, stage: "seedling", name: "Seedling" },
  { minStreak: 7, stage: "sprout", name: "Sprout" },
  { minStreak: 14, stage: "leafy", name: "Leafy Plant" },
  { minStreak: 30, stage: "blooming", name: "Blooming Plant" },
  { minStreak: 60, stage: "thriving", name: "Thriving Plant" },
  { minStreak: 100, stage: "flowering", name: "Flowering Garden" },
];

export function getPlantStageForStreak(streak: number): PlantGrowthStage {
  let result = PLANT_GROWTH_STAGES[0];
  for (const s of PLANT_GROWTH_STAGES) {
    if (streak >= s.minStreak) result = s;
  }
  return result;
}
