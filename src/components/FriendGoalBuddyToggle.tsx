"use client";

import { Users } from "lucide-react";
import clsx from "clsx";

interface FriendGoalBuddyToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

/** Duolingo-style “goal with a friend” toggle for the create-goal form. */
export function FriendGoalBuddyToggle({ checked, onChange, disabled }: FriendGoalBuddyToggleProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        "group relative w-full overflow-hidden rounded-2xl border-2 p-4 text-left transition-all",
        disabled && "cursor-not-allowed opacity-60",
        checked
          ? "border-sky-400 bg-gradient-to-br from-sky-50 via-emerald-50 to-lime-50 shadow-md ring-2 ring-sky-300/50 dark:border-sky-500 dark:from-sky-950/50 dark:via-emerald-950/40 dark:to-lime-950/30 dark:ring-sky-500/30"
          : "border-slate-200 bg-white hover:border-sky-200 hover:bg-sky-50/40 dark:border-slate-600 dark:bg-slate-900/60 dark:hover:border-sky-700"
      )}
      aria-pressed={checked}
    >
      <div className="flex items-start gap-3">
        <div
          className={clsx(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 shadow-sm",
            checked
              ? "border-sky-300 bg-gradient-to-br from-sky-400 to-emerald-500 text-white"
              : "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400"
          )}
        >
          <Users className="h-6 w-6" strokeWidth={2.5} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-base font-bold text-slate-900 dark:text-white">
              Goal with a buddy
            </span>
            <span
              className={clsx(
                "rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide",
                checked
                  ? "bg-sky-500 text-white"
                  : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
              )}
            >
              Duo
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            {checked
              ? "Nice! After you add this goal, send your invite link — you’ll both see each other’s progress."
              : "Same goal, friendly competition. Turn on to get a share link right after you create it."}
          </p>
        </div>
        <div
          className={clsx(
            "mt-1 flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition",
            checked ? "bg-sky-500" : "bg-slate-300 dark:bg-slate-600"
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
      {checked && (
        <div className="mt-3 flex items-center gap-2 border-t border-sky-200/80 pt-3 dark:border-sky-800/60">
          <span className="flex -space-x-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-[10px] font-bold text-white dark:border-slate-900">
              You
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-sky-500 text-lg dark:border-slate-900">
              ?
            </span>
          </span>
          <p className="text-[11px] font-semibold text-sky-800 dark:text-sky-200">
            Waiting for your buddy to join
          </p>
        </div>
      )}
    </button>
  );
}
