"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  History,
  CheckCircle2,
  Calendar,
  Sun,
  ChevronRight,
  Lock,
  Flame,
  Trash2,
  SlidersHorizontal,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Header } from "@/components/Header";
import { getPlan } from "@/lib/store";
import { safeParseISO } from "@/lib/dateUtils";
import { format, isThisWeek } from "date-fns";
import {
  DEFAULT_HISTORY_DISPLAY_SETTINGS,
  getStoredHistoryDisplaySettings,
  type HistoryDisplaySettings,
} from "@/lib/historySettings";

function HistoryContent() {
  const { user, goals, submissions, getSubmissionsForGoal, deleteGoalHistory } = useApp();
  const [historySettings, setHistorySettings] = useState<HistoryDisplaySettings>(
    DEFAULT_HISTORY_DISPLAY_SETTINGS
  );
  const [historyActionMessage, setHistoryActionMessage] = useState<string | null>(null);
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);

  useEffect(() => {
    setHistorySettings(getStoredHistoryDisplaySettings());
  }, []);

  if (!user) {
    return (
      <>
        <Header />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 pb-[max(6.5rem,env(safe-area-inset-bottom))] text-center">
          <p className="text-slate-600 dark:text-slate-400">
            Please sign in from the dashboard.
          </p>
          <Link href="/dashboard" className="mt-4 inline-block text-prove-600 hover:underline">
            Go to Dashboard
          </Link>
        </main>
      </>
    );
  }

  const plan = getPlan(user.plan);
  const isProOrPremium = user.plan === "pro" || user.plan === "premium";

  // Build history: verified submissions grouped by goal, sorted by date
  const verifiedSubs = submissions
    .filter((s) => s.status === "verified")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  function getStreak(goalId: string) {
    const subs = getSubmissionsForGoal(goalId).filter((s) => s.status === "verified");
    const dates = Array.from(new Set(subs.map((s) => s.date))).sort().reverse();
    let streak = 0;
    let d = new Date();
    for (const dateStr of dates) {
      const check = format(d, "yyyy-MM-dd");
      if (dateStr === check) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else break;
    }
    return streak;
  }

  // Group verified subs by goal for history view (with submission for each date to get image)
  const byGoal = goals.map((goal) => {
    const goalSubs = verifiedSubs.filter((s) => s.goalId === goal.id);
    const completedDates = Array.from(new Set(goalSubs.map((s) => s.date))).sort().reverse();
    const subsByDate = new Map(goalSubs.map((s) => [s.date, s]));
    return {
      goal,
      submissions: goalSubs,
      completedDates,
      subsByDate,
      streak: getStreak(goal.id),
    };
  }).filter((g) => g.completedDates.length > 0);

  const enabledSettingCount = [
    historySettings.showProofPhotos,
    historySettings.showStreak,
    historySettings.showVerifiedCount,
    historySettings.showThisWeekBadge,
  ].filter(Boolean).length;

  const handleDeleteGoalHistory = async (goalId: string, goalTitle: string) => {
    setHistoryActionMessage(null);
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        `Delete all history for "${goalTitle}"? This removes verified dates and proof entries for this goal.`
      );
      if (!confirmed) return;
    }

    setDeletingGoalId(goalId);
    try {
      await deleteGoalHistory(goalId);
      setHistoryActionMessage(`Deleted history for "${goalTitle}".`);
    } catch {
      setHistoryActionMessage("Could not delete history right now. Please try again.");
    } finally {
      setDeletingGoalId(null);
    }
  };

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 pb-[max(6.5rem,env(safe-area-inset-bottom))]">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <History className="h-7 w-7 text-prove-600 dark:text-prove-400" />
            Goal history
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            {plan.name} plan · View your completed proofs and streaks over time
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {enabledSettingCount}/4 history display options enabled
            <Link
              href="/settings"
              className="font-medium text-prove-600 hover:underline dark:text-prove-400"
            >
              Edit in Settings
            </Link>
          </div>
        </div>

        {!isProOrPremium ? (
          <div className="rounded-2xl border-2 border-dashed border-prove-200 bg-prove-50/50 p-8 text-center dark:border-prove-800 dark:bg-prove-950/30">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-prove-100 dark:bg-prove-900/50">
              <Lock className="h-7 w-7 text-prove-600 dark:text-prove-400" />
            </div>
            <h2 className="mt-4 font-display text-lg font-semibold text-slate-900 dark:text-white">
              Goal history is a Pro feature
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Upgrade to Pro or Premium to view your full proof history, completed dates per goal, and streak timelines.
            </p>
            <Link
              href="/pricing"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-prove-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-prove-700"
            >
              Upgrade to Pro
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <>
            {byGoal.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900/50">
                <History className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500" />
                <p className="mt-4 text-slate-600 dark:text-slate-400">
                  No completed proofs yet. Submit proof for your goals to see your history here.
                </p>
                <Link
                  href="/dashboard"
                  className="mt-4 inline-block text-sm font-medium text-prove-600 hover:text-prove-700 dark:text-prove-400"
                >
                  Go to Dashboard
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {historyActionMessage && (
                  <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    {historyActionMessage}
                  </p>
                )}
                {byGoal.map(({ goal, completedDates, subsByDate, streak }) => (
                  <section
                    key={goal.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {goal.frequency === "daily" ? (
                          <Sun className="h-5 w-5 shrink-0 text-amber-500" />
                        ) : (
                          <Calendar className="h-5 w-5 shrink-0 text-prove-500" />
                        )}
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                            {goal.title}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            {historySettings.showStreak && (
                              <Flame className="h-3.5 w-3.5 text-amber-500" />
                            )}
                            {[
                              historySettings.showStreak
                                ? `${streak} ${goal.frequency === "daily" ? "day" : "week"} streak`
                                : null,
                              historySettings.showVerifiedCount ? `${completedDates.length} verified` : null,
                            ]
                              .filter((part): part is string => !!part)
                              .join(" · ") || (goal.frequency === "daily" ? "Daily goal" : "Weekly goal")}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <Link
                          href={`/goals/submit?goalId=${goal.id}`}
                          className="rounded-lg bg-prove-100 px-3 py-1.5 text-sm font-medium text-prove-700 hover:bg-prove-200 dark:bg-prove-900/50 dark:text-prove-300 dark:hover:bg-prove-800/50"
                        >
                          Submit
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDeleteGoalHistory(goal.id, goal.title)}
                          disabled={deletingGoalId === goal.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-2.5 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-70 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {deletingGoalId === goal.id ? "Deleting..." : "Delete history"}
                        </button>
                      </div>
                    </div>
                    <ul className="mt-4 space-y-2">
                      {completedDates.slice(0, 10).map((dateStr) => {
                        const d = safeParseISO(dateStr);
                        const label = d ? format(d, "EEE, MMM d, yyyy") : dateStr;
                        const isThisWeekDate = d ? isThisWeek(d) : false;
                        const sub = subsByDate.get(dateStr);
                        const hasImage =
                          historySettings.showProofPhotos &&
                          sub?.imageDataUrl &&
                          sub.imageDataUrl.length > 10;
                        return (
                          <li
                            key={dateStr}
                            className="flex items-center gap-3 rounded-lg bg-slate-50 py-2 px-3 dark:bg-slate-800/50"
                          >
                            {hasImage ? (
                              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-200 dark:bg-slate-700">
                                <img
                                  src={sub!.imageDataUrl}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-prove-100 dark:bg-prove-900/50">
                                <CheckCircle2 className="h-5 w-5 text-prove-500" />
                              </div>
                            )}
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                              {label}
                              {historySettings.showThisWeekBadge && isThisWeekDate && (
                                <span className="ml-2 rounded bg-prove-100 px-1.5 py-0.5 text-xs font-medium text-prove-700 dark:bg-prove-900/80 dark:text-prove-300">
                                  This week
                                </span>
                              )}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    {completedDates.length > 10 && (
                      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                        + {completedDates.length - 10} more completed
                      </p>
                    )}
                  </section>
                ))}
              </div>
            )}

            <Link
              href="/dashboard"
              className="mt-8 block text-center text-sm text-prove-600 hover:underline"
            >
              ← Back to dashboard
            </Link>
          </>
        )}
      </main>
    </>
  );
}

export default function GoalHistoryPage() {
  return <HistoryContent />;
}
