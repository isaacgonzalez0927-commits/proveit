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
  const columnCount =
    visiblePlants.length <= 2
      ? 2
      : visiblePlants.length <= 4
        ? 2
        : visiblePlants.length <= 8
          ? 3
          : 4;

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-cyan-50/50 p-3 dark:border-emerald-900/60 dark:from-emerald-950/30 dark:to-cyan-950/20 ${className}`}
    >
      <div className="relative overflow-hidden rounded-xl border border-emerald-100 bg-white/65 px-2 pb-2 pt-3 dark:border-emerald-900/40 dark:bg-slate-900/45">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-emerald-200/75 via-emerald-100/35 to-transparent dark:from-emerald-900/45 dark:via-emerald-950/25" />
        {visiblePlants.length === 0 ? (
          <div className="relative flex min-h-[140px] items-center justify-center text-center">
            <p className="max-w-[22ch] text-xs text-slate-600 dark:text-slate-400">{emptyLabel}</p>
          </div>
        ) : (
          <div
            className="relative grid gap-1.5 sm:gap-2"
            style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
          >
            {visiblePlants.map((plant) => (
              <div key={plant.id} className="flex h-24 items-end justify-center sm:h-28">
                <div className="origin-bottom scale-[0.72] sm:scale-[0.82]">
                  <PlantIllustration
                    stage={plant.stage}
                    wateringLevel={plant.wateringLevel}
                    wateredGoals={plant.wateringLevel >= 0.99 ? 1 : 0}
                    size="small"
                    variant={plant.variant}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
