"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Flame,
  Calendar,
  ChevronRight,
  Target,
  CheckCircle2,
  Camera,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Header } from "@/components/Header";
import { NotificationPrompt } from "@/components/NotificationPrompt";
import { NotificationScheduler } from "@/components/NotificationScheduler";
import { DashboardTour } from "@/components/DashboardTour";
import { AccountabilityBuddy } from "@/components/AccountabilityBuddy";
import { getPlan } from "@/lib/store";
import { isGoalDue, getNextDueLabel, isWithinSubmissionWindow, getSubmissionWindowMessage } from "@/lib/goalDue";
import { format, isThisWeek, parseISO } from "date-fns";

function DashboardContent() {
  const { user, goals, submissions, getSubmissionsForGoal, checkAndAwardItems } = useApp();
  const thisWeekVerified = submissions.filter((s) => {
    if (s.status !== "verified") return false;
    const d = parseISO(s.date);
    return isThisWeek(d);
  });
  const weeklyByDay = (() => {
    const dayCount: Record<string, number> = {};
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    days.forEach((d) => { dayCount[d] = 0; });
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    for (const s of thisWeekVerified) {
      const d = parseISO(s.date);
      dayCount[days[d.getDay()]]++;
    }
    return dayCount;
  })();
  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white dark:bg-black">
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading your dashboard…</p>
      </main>
    );
  }

  const plan = user ? getPlan(user.plan) : null;
  const dailyGoals = goals.filter((g) => g.frequency === "daily");
  const weeklyGoals = goals.filter((g) => g.frequency === "weekly");
  const todayStr = format(new Date(), "yyyy-MM-dd");

  function getStreak(goal: (typeof goals)[0]) {
    const subs = getSubmissionsForGoal(goal.id).filter((s) => s.status === "verified");
    const dates = Array.from(new Set(subs.map((s) => s.date))).sort().reverse();
    let streak = 0;
    let d = new Date();
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

  const maxStreak = goals.length
    ? Math.max(...goals.map((g) => getStreak(g)), 0)
    : 0;

  useEffect(() => {
    checkAndAwardItems(maxStreak);
  }, [maxStreak, submissions, checkAndAwardItems]);

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

  return (
    <>
      <NotificationScheduler />
      <Header />
      <DashboardTour />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Dashboard
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            {user?.email} · {plan?.name} plan
          </p>
        </div>

        <AccountabilityBuddy
          maxStreak={maxStreak}
          goalsDoneToday={goalsDoneToday}
          totalDueToday={goalsDueToday.length}
        />

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-amber-500" />
              <span className="font-semibold text-slate-900 dark:text-white">
                Current streak
              </span>
            </div>
            <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
              {maxStreak} {maxStreak === 1 ? "day" : "days"}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Keep submitting verified proofs to grow your streak.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-prove-600 dark:text-prove-400" />
              <span className="font-semibold text-slate-900 dark:text-white">
                Goals
              </span>
            </div>
            <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
              {dailyGoals.length} daily, {weeklyGoals.length} weekly
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {plan?.dailyGoals === -1 ? "Unlimited" : plan?.dailyGoals} daily,{" "}
              {plan?.weeklyGoals === -1 ? "Unlimited" : plan?.weeklyGoals} weekly on your plan.
            </p>
          </div>
        </div>

        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Today&apos;s goals
            </h2>
            <Link
              href="/goals"
              className="flex items-center gap-1 text-sm font-medium text-prove-600 hover:text-prove-700 dark:text-prove-400"
            >
              Manage goals
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {goals.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900/50">
              <p className="text-slate-600 dark:text-slate-400">
                No goals yet. Add a daily or weekly goal to get reminders and start proving it.
              </p>
              <Link
                href="/goals"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-prove-600 px-4 py-2 text-sm font-medium text-white hover:bg-prove-700"
              >
                <Plus className="h-4 w-4" />
                Add goal
              </Link>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {dailyGoals.map((goal) => {
                const subs = getSubmissionsForGoal(goal.id);
                const todayProof = subs.find((s) => s.date === todayStr);
                const verified = todayProof?.status === "verified";
                return (
                  <li
                    key={goal.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-center gap-3">
                      {verified ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-prove-500" />
                      ) : (
                        <div className="h-5 w-5 shrink-0 rounded-full border-2 border-slate-300 dark:border-slate-600" />
                      )}
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {goal.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Daily · Streak: {getStreak(goal)} days
                        </p>
                      </div>
                    </div>
                    {verified ? (
                      <span className="flex items-center gap-1 text-sm text-prove-600 dark:text-prove-400">
                        <CheckCircle2 className="h-4 w-4" />
                        Done
                      </span>
                    ) : isWithinSubmissionWindow(goal) ? (
                      <Link
                        href={`/goals/submit?goalId=${goal.id}`}
                        className="flex items-center gap-1 rounded-lg bg-prove-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-prove-700"
                      >
                        <Camera className="h-4 w-4" />
                        Submit proof
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-500 dark:text-slate-400 max-w-[140px]">
                        {getSubmissionWindowMessage(goal) ?? "Not due yet"}
                      </span>
                    )}
                  </li>
                );
              })}
              {weeklyGoals.map((goal) => {
                const subs = getSubmissionsForGoal(goal.id);
                const thisWeekProof = subs.some((s) => {
                  const d = parseISO(s.date);
                  return isThisWeek(d) && s.status === "verified";
                });
                const due = isGoalDue(goal);
                const dueLabel = getNextDueLabel(goal);
                return (
                  <li
                    key={goal.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-center gap-3">
                      {thisWeekProof ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-prove-500" />
                      ) : (
                        <div className="h-5 w-5 shrink-0 rounded-full border-2 border-slate-300 dark:border-slate-600" />
                      )}
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {goal.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Weekly · Streak: {getStreak(goal)} weeks
                          {!due && dueLabel && ` · ${dueLabel}`}
                        </p>
                      </div>
                    </div>
                    {due ? (
                      thisWeekProof ? (
                        <span className="flex items-center gap-1 text-sm text-prove-600 dark:text-prove-400">
                          <CheckCircle2 className="h-4 w-4" />
                          Done
                        </span>
                      ) : isWithinSubmissionWindow(goal) ? (
                        <Link
                          href={`/goals/submit?goalId=${goal.id}`}
                          className="flex items-center gap-1 rounded-lg bg-prove-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-prove-700"
                        >
                          <Camera className="h-4 w-4" />
                          Submit proof
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-500 dark:text-slate-400 max-w-[140px]">
                          {getSubmissionWindowMessage(goal) ?? "Not due yet"}
                        </span>
                      )
                    ) : (
                      <span className="text-sm text-slate-400 dark:text-slate-500">
                        {dueLabel}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="mt-10">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            Weekly recap
          </h2>
          <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {thisWeekVerified.length}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  goals completed this week
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-1 sm:gap-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div
                    key={day}
                    className="flex flex-col items-center rounded-lg bg-slate-50 px-2 py-1.5 dark:bg-slate-800/50"
                  >
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                      {day}
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {weeklyByDay[day] ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {thisWeekVerified.length > 0 && (
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                Keep it up! Your buddy is growing stronger with every goal.
              </p>
            )}
          </div>
        </section>

        <Link
          href="/pricing"
          className="mt-8 block rounded-xl border border-prove-200 bg-prove-50/50 p-4 text-center text-sm text-prove-800 dark:border-prove-800 dark:bg-prove-950/30 dark:text-prove-200"
        >
          Want more goals? Upgrade to Pro or Premium →
        </Link>
      </main>
      <NotificationPrompt />
    </>
  );
}

export default function DashboardPage() {
  return <DashboardContent />;
}
