"use client";

import { useEffect } from "react";
import Link from "next/link";
import { format, isThisWeek, parseISO } from "date-fns";
import { useApp } from "@/context/AppContext";
import { isGoalDue } from "@/lib/goalDue";
import { Header } from "@/components/Header";
import { AccountabilityBuddy } from "@/components/AccountabilityBuddy";

function getStreak(
  goal: { id: string; frequency: string },
  getSubmissionsForGoal: (id: string) => { date: string; status: string }[]
) {
  const subs = getSubmissionsForGoal(goal.id).filter((s) => s.status === "verified");
  const dates = Array.from(new Set(subs.map((s) => s.date))).sort().reverse();
  let streak = 0;
  const d = new Date();
  const today = format(d, "yyyy-MM-dd");
  for (const dateStr of dates) {
    const check = format(d, "yyyy-MM-dd");
    if (dateStr === check) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
}

export default function BuddyPage() {
  const { user, goals, submissions, getSubmissionsForGoal, checkAndAwardItems } = useApp();
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const maxStreak = goals.length
    ? Math.max(...goals.map((g) => getStreak(g, getSubmissionsForGoal)), 0)
    : 0;

  const goalsDueToday = goals.filter((g) => isGoalDue(g));
  const goalsDoneToday = goalsDueToday.filter((g) => {
    const subs = getSubmissionsForGoal(g.id);
    if (g.frequency === "daily") {
      return subs.some((s) => s.date === todayStr && s.status === "verified");
    }
    return subs.some((s) => {
      const d = parseISO(s.date);
      return isThisWeek(d) && s.status === "verified";
    });
  }).length;

  useEffect(() => {
    checkAndAwardItems(maxStreak);
  }, [maxStreak, submissions, checkAndAwardItems]);

  if (!user) {
    return (
      <>
        <Header />
        <main className="flex min-h-screen items-center justify-center bg-white dark:bg-black">
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Your Buddy
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Choose your animal buddy and complete goals to help them grow!
          </p>
        </div>

        <AccountabilityBuddy
          maxStreak={maxStreak}
          goalsDoneToday={goalsDoneToday}
          totalDueToday={goalsDueToday.length}
          large
        />

        <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
          <h2 className="font-semibold text-slate-900 dark:text-white">Growth stages</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li>• 0 days: Baby Buddy — just getting started</li>
            <li>• 14 days: Buddy Toddler — two weeks strong!</li>
            <li>• 30 days: Buddy Growing — building momentum</li>
            <li>• 60 days: Buddy Strong — two months of dedication</li>
            <li>• 100 days: Champion Buddy — you&apos;re unstoppable</li>
          </ul>
        </div>

        <Link
          href="/dashboard"
          className="mt-8 block text-center text-sm text-prove-600 hover:underline dark:text-prove-400"
        >
          ← Back to dashboard
        </Link>
      </main>
    </>
  );
}
