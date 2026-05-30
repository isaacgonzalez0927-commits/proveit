"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Award, ChevronRight, Sparkles, Zap } from "lucide-react";
import { AchievementCard } from "@/components/AchievementCard";
import { BuddySection } from "@/components/buddies/BuddySection";
import { useApp } from "@/context/AppContext";
import {
  ACHIEVEMENTS,
  computeAchievementStats,
  countUnlockedAchievements,
  evaluateAllAchievements,
  isPremiumMember,
  isProMember,
} from "@/lib/achievements";

export function BuddyHubAchievements() {
  const { user, goals, submissions, graceDayEvents, getSubmissionsForGoal } = useApp();

  const stats = useMemo(
    () => computeAchievementStats(goals, submissions, graceDayEvents, getSubmissionsForGoal),
    [goals, submissions, graceDayEvents, getSubmissionsForGoal]
  );
  const progressList = useMemo(
    () => evaluateAllAchievements(stats, user?.plan, submissions),
    [stats, user?.plan, submissions]
  );
  const unlockedCount = countUnlockedAchievements(progressList);
  const isPremium = isPremiumMember(user);
  const isPro = isProMember(user);

  const freeAchievements = ACHIEVEMENTS.filter((a) => a.tier === "free");
  const proAchievements = ACHIEVEMENTS.filter((a) => a.tier === "pro");
  const premiumAchievements = ACHIEVEMENTS.filter((a) => a.tier === "premium");

  return (
    <BuddySection
      id="achievements"
      title="Achievements"
      description="Badges you earn from proofs, streaks, and your garden."
    >
      <div className="rounded-2xl p-4 glass-card">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-prove-100 text-prove-700 dark:bg-prove-950/60 dark:text-prove-400">
              <Award className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{unlockedCount}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                of {ACHIEVEMENTS.length} unlocked
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-slate-500 dark:text-slate-400">
            <p>{stats.totalProofs} proofs</p>
            <p>{stats.maxStreak} best streak</p>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-prove-500 to-emerald-400 transition-all duration-500"
            style={{ width: `${Math.round((unlockedCount / ACHIEVEMENTS.length) * 100)}%` }}
          />
        </div>
      </div>

      {!isPro && (
        <div className="mt-3 rounded-2xl border border-prove-200/80 bg-prove-50/80 p-3 dark:border-prove-900/50 dark:bg-prove-950/20">
          <p className="flex items-center gap-2 text-sm font-semibold text-prove-900 dark:text-prove-200">
            <Zap className="h-4 w-4" />
            Pro badges
          </p>
          <Link
            href="/pricing"
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-prove-800 hover:underline dark:text-prove-200"
          >
            View Pro
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {!isPremium && (
        <div className="mt-3 rounded-2xl border border-amber-200/80 bg-amber-50/80 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
            <Sparkles className="h-4 w-4" />
            Premium badges
          </p>
          <Link
            href="/pricing"
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-800 hover:underline dark:text-amber-200"
          >
            View Premium
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      <div className="mt-4 space-y-4">
        <div className="space-y-2">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Free</p>
          {freeAchievements.map((item) => (
            <AchievementCard
              key={item.id}
              item={item}
              progress={progressList.find((p) => p.id === item.id)!}
            />
          ))}
        </div>
        <div className="space-y-2">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Pro</p>
          {proAchievements.map((item) => (
            <AchievementCard
              key={item.id}
              item={item}
              progress={progressList.find((p) => p.id === item.id)!}
            />
          ))}
        </div>
        <div className="space-y-2">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Premium</p>
          {premiumAchievements.map((item) => (
            <AchievementCard
              key={item.id}
              item={item}
              progress={progressList.find((p) => p.id === item.id)!}
            />
          ))}
        </div>
      </div>
    </BuddySection>
  );
}
