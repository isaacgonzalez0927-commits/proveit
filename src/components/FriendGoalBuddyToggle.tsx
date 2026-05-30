"use client";

import { Users } from "lucide-react";
import clsx from "clsx";

interface FriendGoalBuddyToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

/** Optional buddy invite when creating a goal — matches garden form styling. */
export function FriendGoalBuddyToggle({ checked, onChange, disabled }: FriendGoalBuddyToggleProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        "group relative w-full rounded-xl border p-4 text-left transition-all",
        disabled && "cursor-not-allowed opacity-60",
        checked
          ? "border-prove-400/90 bg-prove-50/80 ring-1 ring-prove-500/25 dark:border-prove-600/70 dark:bg-prove-950/40 dark:ring-prove-500/20"
          : "border-slate-200 bg-white shadow-sm hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-slate-600"
      )}
      aria-pressed={checked}
    >
      <div className="flex items-start gap-3">
        <div
          className={clsx(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            checked
              ? "bg-prove-600 text-white"
              : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
          )}
        >
          <Users className="h-5 w-5" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              Goal with a buddy
            </span>
            {checked && (
              <span className="rounded-full bg-prove-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                On
              </span>
            )}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            {checked
              ? "After you add this goal, send your invite link — you’ll both see each other’s progress."
              : "Same goal, friendly accountability. Turn on to get a share link after you create it."}
          </p>
        </div>
        <div
          className={clsx(
            "mt-0.5 flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition",
            checked ? "bg-prove-600" : "bg-slate-300 dark:bg-slate-600"
          )}
          aria-hidden
        >
          <span
            className={clsx(
              "h-6 w-6 rounded-full bg-white shadow transition-transform",
              checked ? "translate-x-5" : "translate-x-0"
            )}
          />
        </div>
      </div>
    </button>
  );
}
