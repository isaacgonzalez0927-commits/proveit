"use client";

import { useId } from "react";
import { Minus, Plus } from "lucide-react";
import type { TimesPerWeek } from "@/types";
import { timesPerWeekSummary } from "@/lib/goalSchedule";
import clsx from "clsx";

function clampTw(n: number): TimesPerWeek {
  const r = Math.round(n);
  if (r < 1) return 1;
  if (r > 7) return 7;
  return r as TimesPerWeek;
}

type Props = {
  value: TimesPerWeek;
  onChange: (n: TimesPerWeek) => void;
  /** Larger touch targets and typography (create goal form). */
  size?: "default" | "compact";
};

export function TimesPerWeekControl({ value, onChange, size = "default" }: Props) {
  const rangeId = useId();
  const v = clampTw(value);
  const { headline, dueLine } = timesPerWeekSummary(v);
  const compact = size === "compact";

  const bump = (delta: number) => onChange(clampTw(v + delta));

  return (
    <div className={clsx("rounded-xl border border-slate-200/90 bg-slate-50/60 dark:border-slate-600 dark:bg-slate-900/40", compact ? "p-3" : "p-4")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            className={clsx(
              "font-semibold text-slate-900 dark:text-white",
              compact ? "text-sm" : "text-base"
            )}
          >
            {headline}
          </p>
          <p className={clsx("mt-1 text-slate-600 dark:text-slate-400", compact ? "text-[10px] leading-snug" : "text-xs leading-snug")}>
            {dueLine}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-600 dark:bg-slate-950">
          <button
            type="button"
            aria-label="Fewer check-ins per week"
            disabled={v <= 1}
            onClick={() => bump(-1)}
            className={clsx(
              "flex items-center justify-center rounded-l-md text-slate-600 transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800",
              compact ? "h-9 w-9" : "h-11 w-11"
            )}
          >
            <Minus className="h-4 w-4" strokeWidth={2.25} />
          </button>
          <span
            className={clsx(
              "min-w-[2.25rem] select-none text-center font-display font-bold tabular-nums text-prove-700 dark:text-prove-300",
              compact ? "text-lg" : "text-xl"
            )}
            aria-live="polite"
          >
            {v}
          </span>
          <button
            type="button"
            aria-label="More check-ins per week"
            disabled={v >= 7}
            onClick={() => bump(1)}
            className={clsx(
              "flex items-center justify-center rounded-r-md text-slate-600 transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800",
              compact ? "h-9 w-9" : "h-11 w-11"
            )}
          >
            <Plus className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </div>
      </div>

      <div className={clsx(compact ? "mt-3" : "mt-4")} data-prevent-tab-swipe="true">
        <label className="sr-only" htmlFor={rangeId}>
          Check-ins per week, 1 to 7
        </label>
        <input
          id={rangeId}
          type="range"
          min={1}
          max={7}
          step={1}
          value={v}
          onChange={(e) => onChange(clampTw(Number(e.target.value)))}
          className={clsx(
            "w-full cursor-pointer touch-pan-x appearance-none rounded-full bg-slate-200/90 accent-prove-600 dark:bg-slate-700/90 dark:accent-prove-500",
            compact ? "h-2" : "h-2.5"
          )}
        />
      </div>
    </div>
  );
}
