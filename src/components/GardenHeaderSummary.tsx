"use client";

import type { PlantHealthState } from "@/lib/plantState";

export type GardenSummaryCounts = {
  thriving: number;
  needsWater: number;
  wilted: number;
  shielded: number;
  total: number;
};

interface GardenHeaderSummaryProps {
  counts: GardenSummaryCounts;
  onScrollToNeedsWater?: () => void;
  className?: string;
}

export function GardenHeaderSummary({
  counts,
  onScrollToNeedsWater,
  className = "",
}: GardenHeaderSummaryProps) {
  if (counts.total === 0) return null;

  const needsAttention = counts.needsWater + counts.wilted;

  return (
    <div
      className={`mt-3 flex flex-wrap items-center gap-2 text-xs ${className}`}
      role="status"
    >
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/90 px-2.5 py-1 font-medium text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
        {counts.thriving} thriving
      </span>
      {counts.shielded > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-200/90 px-2.5 py-1 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {counts.shielded} shielded
        </span>
      )}
      {needsAttention > 0 && (
        <button
          type="button"
          onClick={onScrollToNeedsWater}
          className="inline-flex items-center gap-1 rounded-full bg-amber-100/90 px-2.5 py-1 font-medium text-amber-900 transition hover:bg-amber-200/90 dark:bg-amber-950/50 dark:text-amber-200 dark:hover:bg-amber-900/50"
        >
          {needsAttention} need{needsAttention === 1 ? "" : ""} water
        </button>
      )}
    </div>
  );
}

export function summarizeGardenHealth(
  entries: Array<{ plantHealthState: PlantHealthState }>
): GardenSummaryCounts {
  const counts: GardenSummaryCounts = {
    thriving: 0,
    needsWater: 0,
    wilted: 0,
    shielded: 0,
    total: entries.length,
  };
  for (const e of entries) {
    switch (e.plantHealthState) {
      case "healthy":
        counts.thriving += 1;
        break;
      case "shielded":
        counts.shielded += 1;
        break;
      case "wilting":
        counts.needsWater += 1;
        break;
      case "dead":
        counts.wilted += 1;
        break;
      default:
        break;
    }
  }
  return counts;
}
