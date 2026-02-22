"use client";

import { PlantIllustration, type PlantStageKey } from "@/components/PlantIllustration";
import type { GoalPlantVariant } from "@/lib/goalPlants";

export interface GardenSnapshotPlant {
  id: string;
  stage: PlantStageKey;
  wateringLevel: number;
  variant: GoalPlantVariant;
}

interface GardenSnapshotProps {
  plants: GardenSnapshotPlant[];
  className?: string;
  maxPlants?: number;
  emptyLabel?: string;
}

export function GardenSnapshot({
  plants,
  className = "",
  maxPlants = 12,
  emptyLabel = "No plants yet. Add a goal to start your garden.",
}: GardenSnapshotProps) {
  const visiblePlants = plants.slice(0, maxPlants);

  return (
    <div className={className}>
      {visiblePlants.length === 0 ? (
        <div className="flex min-h-[100px] items-center justify-center text-center">
          <p className="max-w-[22ch] text-xs text-slate-600 dark:text-slate-400">{emptyLabel}</p>
        </div>
      ) : (
        <div className="flex flex-wrap items-end justify-center gap-3 sm:gap-4">
          {visiblePlants.map((plant) => (
            <div
              key={plant.id}
              className="flex h-[96px] w-[74px] shrink-0 items-end justify-center"
            >
              <PlantIllustration
                stage={plant.stage}
                wateringLevel={plant.wateringLevel}
                wateredGoals={plant.wateringLevel >= 0.99 ? 1 : 0}
                size="small"
                variant={plant.variant}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
