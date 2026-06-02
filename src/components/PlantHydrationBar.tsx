"use client";

import type { PlantHealthState } from "@/lib/plantState";
import { gardenHealthLabel } from "@/lib/plantState";

interface PlantHydrationBarProps {
  verified: number;
  needed: number;
  progress: number;
  healthState: PlantHealthState;
  onPace: boolean;
  recoveryActive?: boolean;
  inBloomSeason?: boolean;
  perfectWeekStreak?: number;
  className?: string;
}

export function PlantHydrationBar({
  verified,
  needed,
  progress,
  healthState,
  onPace,
  recoveryActive = false,
  inBloomSeason = false,
  perfectWeekStreak = 0,
  className = "",
}: PlantHydrationBarProps) {
  const pct = Math.round(progress * 100);
  const barColor =
    healthState === "dead"
      ? "bg-amber-700"
      : healthState === "wilting"
        ? "bg-amber-500"
        : healthState === "shielded"
          ? "bg-slate-400"
          : "bg-prove-500";

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <span className="font-medium text-slate-600 dark:text-slate-400">
          {verified}/{needed} verified this week
        </span>
        <span
          className={
            healthState === "healthy" || healthState === "shielded"
              ? "text-emerald-700 dark:text-emerald-300"
              : healthState === "wilting"
                ? "text-amber-700 dark:text-amber-300"
                : "text-amber-900 dark:text-amber-200"
          }
        >
          {gardenHealthLabel(healthState, recoveryActive)}
          {inBloomSeason ? " · Bloom season" : ""}
          {!inBloomSeason && perfectWeekStreak > 0
            ? ` · ${perfectWeekStreak}/4 perfect weeks`
            : ""}
          {!onPace && healthState === "healthy" && !recoveryActive ? " · catch up" : ""}
        </span>
      </div>
      <div
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-emerald-100/90 dark:bg-emerald-950/80"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Weekly hydration ${pct}%`}
      >
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
          style={{ width: `${Math.max(pct, healthState === "dead" ? 8 : 4)}%` }}
        />
      </div>
    </div>
  );
}
