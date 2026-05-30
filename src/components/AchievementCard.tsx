"use client";

import { Crown, Lock, Zap } from "lucide-react";
import {
  ACHIEVEMENTS,
  PREMIUM_ACHIEVEMENT_REWARDS,
  type AchievementProgress,
} from "@/lib/achievements";

interface AchievementCardProps {
  item: (typeof ACHIEVEMENTS)[number];
  progress: AchievementProgress;
}

export function AchievementCard({ item, progress }: AchievementCardProps) {
  const rewardId = PREMIUM_ACHIEVEMENT_REWARDS[item.id];
  const pct = progress.target > 0 ? Math.round((progress.progress / progress.target) * 100) : 0;

  return (
    <article
      className={`rounded-2xl p-4 glass-card ${
        progress.unlocked
          ? "ring-1 ring-prove-300/80 dark:ring-prove-700/60"
          : progress.lockedByPlan
            ? "opacity-90"
            : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ${
            progress.unlocked
              ? "bg-prove-100 dark:bg-prove-950/50"
              : "bg-slate-100 dark:bg-slate-800"
          }`}
        >
          {item.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-900 dark:text-white">{item.title}</h3>
            {item.tier === "pro" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-prove-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-prove-800 dark:bg-prove-950/60 dark:text-prove-300">
                <Zap className="h-3 w-3" />
                Pro
              </span>
            )}
            {item.tier === "premium" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                <Crown className="h-3 w-3" />
                Premium
              </span>
            )}
            {progress.unlocked && (
              <span className="rounded-full bg-prove-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-prove-700 dark:bg-prove-950 dark:text-prove-300">
                Unlocked
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{item.description}</p>
          {rewardId && progress.unlocked && (
            <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">
              Reward unlocked — exclusive buddy cosmetic
            </p>
          )}
          {!progress.unlocked && (
            <div className="mt-3">
              {progress.lockedByPlan ? (
                <p className="inline-flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
                  <Lock className="h-3.5 w-3.5" />
                  {item.tier === "premium"
                    ? "Upgrade to Premium to earn this achievement"
                    : "Upgrade to Pro to earn this achievement"}
                </p>
              ) : (
                <>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full bg-prove-500 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {progress.progress} / {progress.target}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
