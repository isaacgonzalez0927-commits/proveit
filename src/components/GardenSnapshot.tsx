"use client";

import { PlantIllustration, type PlantStageKey } from "@/components/PlantIllustration";
import type { GoalPlantVariant } from "@/lib/goalPlants";
import type { PlantHealthState } from "@/lib/plantState";

export interface GardenSnapshotPlant {
  id: string;
  stage: PlantStageKey;
  wateringLevel: number;
  variant: GoalPlantVariant;
  healthState?: PlantHealthState;
}

interface GardenSnapshotProps {
  plants: GardenSnapshotPlant[];
  className?: string;
  maxPlants?: number;
  emptyLabel?: string;
  highlightGoalId?: string | null;
}

export function GardenSnapshot({
  plants,
  className = "",
  maxPlants = 12,
  emptyLabel = "No plants yet. Add a goal to start your garden.",
  highlightGoalId = null,
}: GardenSnapshotProps) {
  const visiblePlants = plants.slice(0, maxPlants);

  return (
    <div className={`min-w-0 overflow-x-clip ${className}`}>
      {visiblePlants.length === 0 ? (
        <div className="flex min-h-[100px] items-center justify-center text-center">
          <p className="max-w-[22ch] text-xs text-slate-600 dark:text-slate-400">{emptyLabel}</p>
        </div>
      ) : (
        <div className="flex w-full flex-wrap items-end justify-center gap-x-1 gap-y-1 overflow-hidden sm:gap-x-1.5">
          {visiblePlants.map((plant) => (
            <div
              key={plant.id}
              className={`flex h-[84px] w-[calc((100%-0.75rem)/4)] max-w-[74px] min-w-[56px] items-end justify-center overflow-hidden sm:h-[96px] sm:w-[74px] sm:min-w-0 sm:max-w-none ${
                highlightGoalId === plant.id ? "animate-plant-water-pulse" : ""
              }`}
            >
              <PlantIllustration
                key={`${plant.id}-${plant.stage}-${plant.variant}`}
                stage={plant.stage}
                wateringLevel={plant.wateringLevel}
                wateredGoals={plant.wateringLevel >= 0.99 ? 1 : 0}
                size="small"
                variant={plant.variant}
                healthState={plant.healthState}
                className="max-h-full max-w-full"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
