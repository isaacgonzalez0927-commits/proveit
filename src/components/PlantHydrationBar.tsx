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
  shortWeekLabel?: string | null;
  signupWeekNoPenalty?: boolean;
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
  shortWeekLabel: shortWeekNote = null,
  signupWeekNoPenalty = false,
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

  const statusBits = [
    gardenHealthLabel(healthState, recoveryActive, signupWeekNoPenalty),
    inBloomSeason ? "Bloom season" : null,
    !inBloomSeason && perfectWeekStreak > 0 ? `${perfectWeekStreak}/4 perfect weeks` : null,
    !onPace && healthState === "healthy" && !recoveryActive ? "catch up" : null,
  ].filter(Boolean) as string[];

  return (
    <div className={`min-w-0 ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-[10px]">
        <span className="shrink-0 font-medium text-slate-600 dark:text-slate-400">
          {verified}/{needed} verified this week
        </span>
        <span
          className={
            healthState === "healthy" || healthState === "shielded"
              ? "min-w-0 text-right text-emerald-700 dark:text-emerald-300"
              : healthState === "wilting"
                ? "min-w-0 text-right text-amber-700 dark:text-amber-300"
                : "min-w-0 text-right text-amber-900 dark:text-amber-200"
          }
        >
          {statusBits.join(" · ")}
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
      {shortWeekNote ? (
        <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{shortWeekNote}</p>
      ) : null}
    </div>
  );
}
