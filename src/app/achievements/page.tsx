"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Crown,
  Lock,
  Sparkles,
  Zap,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import {
  ACHIEVEMENTS,
  computeAchievementStats,
  countUnlockedAchievements,
  evaluateAllAchievements,
  isPremiumMember,
  isProMember,
  PREMIUM_ACHIEVEMENT_REWARDS,
  type AchievementProgress,
} from "@/lib/achievements";

function AchievementCard({ item, progress }: { item: (typeof ACHIEVEMENTS)[number]; progress: AchievementProgress }) {
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
            <h2 className="font-semibold text-slate-900 dark:text-white">{item.title}</h2>
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

export default function AchievementsPage() {
  const { user, goals, submissions, graceDayEvents, getSubmissionsForGoal } = useApp();

  const isPremium = isPremiumMember(user);
  const isPro = isProMember(user);
  const stats = useMemo(
    () => computeAchievementStats(goals, submissions, graceDayEvents, getSubmissionsForGoal),
    [goals, submissions, graceDayEvents, getSubmissionsForGoal]
  );
  const progressList = useMemo(
    () => evaluateAllAchievements(stats, user?.plan, submissions),
    [stats, user?.plan, submissions]
  );
  const unlockedCount = countUnlockedAchievements(progressList);
  const freeAchievements = ACHIEVEMENTS.filter((a) => a.tier === "free");
  const proAchievements = ACHIEVEMENTS.filter((a) => a.tier === "pro");
  const premiumAchievements = ACHIEVEMENTS.filter((a) => a.tier === "premium");

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 pb-[max(6.5rem,env(safe-area-inset-bottom))] text-center">
        <p className="text-slate-600 dark:text-slate-400">Please sign in from the dashboard.</p>
        <Link href="/dashboard" className="mt-4 inline-block text-prove-600 hover:underline">
          Go to Dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-6 pb-[max(6.5rem,env(safe-area-inset-bottom))] sm:py-8">
      <header className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex h-10 w-10 items-center justify-center rounded-full text-slate-900 active:bg-slate-200/70 dark:text-white dark:active:bg-white/10"
          aria-label="Back to dashboard"
        >
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="h-7 w-7 text-prove-600 dark:text-prove-400" />
            Achievements
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {unlockedCount} of {ACHIEVEMENTS.length} unlocked
          </p>
        </div>
      </header>

      <section className="rounded-2xl p-5 glass-card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Your progress
            </p>
            <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">{unlockedCount}</p>
          </div>
          <div className="text-right text-sm text-slate-600 dark:text-slate-400">
            <p>{stats.totalProofs} total proofs</p>
            <p>{stats.maxStreak} best streak</p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-prove-500 to-emerald-400 transition-all duration-500"
            style={{ width: `${Math.round((unlockedCount / ACHIEVEMENTS.length) * 100)}%` }}
          />
        </div>
      </section>

      {!isPro && (
        <div className="rounded-2xl border border-prove-200/80 bg-prove-50/80 p-4 dark:border-prove-900/50 dark:bg-prove-950/20">
          <p className="flex items-center gap-2 text-sm font-semibold text-prove-900 dark:text-prove-200">
            <Zap className="h-4 w-4" />
            Pro achievements
          </p>
          <p className="mt-1 text-sm text-prove-800/90 dark:text-prove-200/80">
            Upgrade to Pro to unlock more badges for proofs, streaks, and shields.
          </p>
          <Link
            href="/pricing"
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-prove-900 hover:underline dark:text-prove-200"
          >
            View Pro
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {!isPremium && (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
            <Sparkles className="h-4 w-4" />
            Premium achievements
          </p>
          <p className="mt-1 text-sm text-amber-800/90 dark:text-amber-200/80">
            Upgrade to Premium to unlock exclusive badges and buddy cosmetics.
          </p>
          <Link
            href="/pricing"
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-amber-900 hover:underline dark:text-amber-200"
          >
            View Premium
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Free</h2>
        {freeAchievements.map((item) => (
          <AchievementCard
            key={item.id}
            item={item}
            progress={progressList.find((p) => p.id === item.id)!}
          />
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Pro</h2>
        {proAchievements.map((item) => (
          <AchievementCard
            key={item.id}
            item={item}
            progress={progressList.find((p) => p.id === item.id)!}
          />
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Premium exclusive
        </h2>
        {premiumAchievements.map((item) => (
          <AchievementCard
            key={item.id}
            item={item}
            progress={progressList.find((p) => p.id === item.id)!}
          />
        ))}
      </section>
    </main>
  );
}
