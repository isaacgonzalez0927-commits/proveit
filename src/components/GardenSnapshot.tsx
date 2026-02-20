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

interface PlantPlacement {
  xPercent: number;
  bottomPx: number;
  scale: number;
  zIndex: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getRowCounts(totalPlants: number): number[] {
  if (totalPlants <= 0) return [];
  const rowCount = Math.min(
    totalPlants,
    totalPlants <= 2 ? 1 : totalPlants <= 6 ? 2 : totalPlants <= 10 ? 3 : 4
  );
  const weights = Array.from({ length: rowCount }, (_, i) => i + 1); // back -> front
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const rowCounts = weights.map((weight) => Math.max(1, Math.floor((weight / totalWeight) * totalPlants)));

  let assigned = rowCounts.reduce((sum, count) => sum + count, 0);
  while (assigned > totalPlants) {
    for (let i = rowCounts.length - 1; i >= 0 && assigned > totalPlants; i -= 1) {
      if (rowCounts[i] > 1) {
        rowCounts[i] -= 1;
        assigned -= 1;
      }
    }
  }
  while (assigned < totalPlants) {
    rowCounts[rowCounts.length - 1] += 1;
    assigned += 1;
  }

  return rowCounts;
}

function getGardenPlacements(totalPlants: number): PlantPlacement[] {
  const rowCounts = getRowCounts(totalPlants);
  const placements: PlantPlacement[] = [];
  const totalRows = rowCounts.length;

  rowCounts.forEach((countInRow, rowIndex) => {
    const depth = totalRows <= 1 ? 1 : rowIndex / (totalRows - 1); // 0 back -> 1 front
    const spread = 24 + depth * 48;
    const step = countInRow <= 1 ? 0 : spread / (countInRow - 1);
    const start = 50 - spread / 2;
    const bottomPx = 16 + (totalRows - 1 - rowIndex) * 18;
    const scale = 0.58 + depth * 0.28;
    const wobble = 1.1 + depth * 1.1;

    for (let i = 0; i < countInRow; i += 1) {
      const xRaw = countInRow <= 1 ? 50 : start + i * step;
      const xPercent = clamp(xRaw + (i % 2 === 0 ? -wobble : wobble), 8, 92);
      placements.push({
        xPercent,
        bottomPx,
        scale,
        zIndex: 10 + rowIndex,
      });
    }
  });

  return placements;
}

export function GardenSnapshot({
  plants,
  className = "",
  maxPlants = 12,
  emptyLabel = "No plants yet. Add a goal to start your garden.",
}: GardenSnapshotProps) {
  const visiblePlants = plants.slice(0, maxPlants);
  const placements = getGardenPlacements(visiblePlants.length);

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-cyan-50/50 p-3 dark:border-emerald-900/60 dark:from-emerald-950/30 dark:to-cyan-950/20 ${className}`}
    >
      <div className="relative overflow-hidden rounded-xl border border-emerald-100 bg-white/65 px-2 pb-2 pt-3 dark:border-emerald-900/40 dark:bg-slate-900/45">
        {visiblePlants.length === 0 ? (
          <div className="relative flex min-h-[140px] items-center justify-center text-center">
            <p className="max-w-[22ch] text-xs text-slate-600 dark:text-slate-400">{emptyLabel}</p>
          </div>
        ) : (
          <div className="relative min-h-[160px] overflow-hidden rounded-lg sm:min-h-[182px]">
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-emerald-200/80 via-emerald-100/35 to-transparent dark:from-emerald-900/55 dark:via-emerald-950/25" />
            {visiblePlants.map((plant, index) => {
              const placement = placements[index];
              if (!placement) return null;
              return (
                <div
                  key={plant.id}
                  className="absolute -translate-x-1/2"
                  style={{
                    left: `${placement.xPercent}%`,
                    bottom: `${placement.bottomPx}px`,
                    zIndex: placement.zIndex,
                  }}
                >
                  <div className="origin-bottom" style={{ transform: `scale(${placement.scale})` }}>
                  <PlantIllustration
                    stage={plant.stage}
                    wateringLevel={plant.wateringLevel}
                    wateredGoals={plant.wateringLevel >= 0.99 ? 1 : 0}
                    size="small"
                    variant={plant.variant}
                  />
                </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
