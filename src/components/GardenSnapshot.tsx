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
    <div
      className={`overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-cyan-50/50 p-3 dark:border-emerald-900/60 dark:from-emerald-950/30 dark:to-cyan-950/20 ${className}`}
    >
      <div className="overflow-hidden rounded-xl border border-emerald-100 bg-white/65 p-3 dark:border-emerald-900/40 dark:bg-slate-900/45">
        {visiblePlants.length === 0 ? (
          <div className="flex min-h-[140px] items-center justify-center text-center">
            <p className="max-w-[22ch] text-xs text-slate-600 dark:text-slate-400">{emptyLabel}</p>
          </div>
        ) : (
          <div className="flex flex-wrap items-end gap-2 sm:gap-3">
            {visiblePlants.map((plant) => (
              <div
                key={plant.id}
                className="flex h-[96px] w-[74px] items-end justify-center rounded-lg border border-emerald-100 bg-white/70 p-1 dark:border-emerald-900/50 dark:bg-slate-900/70"
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
    </div>
  );
}
