"use client";

import { Flame } from "lucide-react";
import { useTodayProgress } from "@/hooks/useTodayProgress";

/** Compact progress chrome — hides on short viewports so it doesn't crowd the phone. */
export function StatusStrip() {
  const { signedIn, maxStreak, doneToday, dueToday, progressRatio, streakUnit } =
    useTodayProgress();

  if (!signedIn) return null;

  const pct = Math.round(progressRatio * 100);
  const todayLabel =
    dueToday === 0
      ? "Nothing due"
      : `${doneToday}/${dueToday} today`;

  return (
    <div
      className="status-strip border-b border-slate-200/60 dark:border-slate-800/50"
      role="status"
      aria-label={`Streak ${maxStreak} ${streakUnit}s, ${todayLabel}`}
    >
      <div className="mx-auto flex max-w-2xl items-center gap-2 px-3 py-1.5 sm:gap-3 sm:px-6 sm:py-2">
        <div className="flex shrink-0 items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300 sm:gap-1.5 sm:px-2.5 sm:py-1">
          <Flame className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={2.5} aria-hidden />
          <span className="text-[11px] font-bold tabular-nums sm:text-xs">
            {maxStreak}
            <span className="ml-0.5 font-semibold opacity-80">
              {maxStreak === 1 ? streakUnit : `${streakUnit}s`}
            </span>
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="hidden truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 sm:block sm:text-[11px]">
              Today&apos;s path
            </p>
            <p className="min-w-0 truncate text-[11px] font-bold tabular-nums text-slate-800 dark:text-slate-100 sm:shrink-0 sm:text-xs">
              {todayLabel}
            </p>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200/90 dark:bg-slate-800 sm:mt-1.5 sm:h-2.5">
            <div
              className="status-strip-bar h-full rounded-full bg-prove-500 transition-[width] duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
