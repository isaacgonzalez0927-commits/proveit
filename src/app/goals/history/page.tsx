"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Images,
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
import {
  getStoredHiddenHistoryGoalIds,
  hideGoalFromHistory,
  saveHiddenHistoryGoalIds,
} from "@/lib/historyVisibility";

function GalleryContent() {
  const { user, goals, submissions, getSubmissionsForGoal } = useApp();
  const [historySettings, setHistorySettings] = useState<HistoryDisplaySettings>(
    DEFAULT_HISTORY_DISPLAY_SETTINGS
  );
  const [historyActionMessage, setHistoryActionMessage] = useState<string | null>(null);
  const [hidingGoalId, setHidingGoalId] = useState<string | null>(null);
  const [hiddenGoalIds, setHiddenGoalIds] = useState<string[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string>("all");

  useEffect(() => {
    setHistorySettings(getStoredHistoryDisplaySettings());
    setHiddenGoalIds(getStoredHiddenHistoryGoalIds());
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

  // Build gallery source: verified submissions grouped by goal, sorted by date
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

  const byGoal = useMemo(
    () =>
      goals
        .map((goal) => {
          const goalSubs = verifiedSubs.filter((s) => s.goalId === goal.id);
          const completedDates = Array.from(new Set(goalSubs.map((s) => s.date))).sort().reverse();
          const subsByDate = new Map(goalSubs.map((s) => [s.date, s]));
          return {
            goal,
            completedDates,
            subsByDate,
            streak: getStreak(goal.id),
          };
        })
        .filter((g) => g.completedDates.length > 0 && !hiddenGoalIds.includes(g.goal.id)),
    [goals, verifiedSubs, hiddenGoalIds]
  );

  useEffect(() => {
    if (selectedGoalId === "all") return;
    const exists = byGoal.some((entry) => entry.goal.id === selectedGoalId);
    if (!exists) setSelectedGoalId("all");
  }, [selectedGoalId, byGoal]);

  const filteredGoals =
    selectedGoalId === "all" ? byGoal : byGoal.filter((entry) => entry.goal.id === selectedGoalId);

  const enabledSettingCount = [
    historySettings.showProofPhotos,
    historySettings.showStreak,
    historySettings.showVerifiedCount,
    historySettings.showThisWeekBadge,
  ].filter(Boolean).length;

  const handleHideGoalFromHistory = async (goalId: string, goalTitle: string) => {
    setHistoryActionMessage(null);
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        `Hide "${goalTitle}" from Gallery? You can restore hidden goals from Settings.`
      );
      if (!confirmed) return;
    }

    setHidingGoalId(goalId);
    const nextHiddenGoalIds = hideGoalFromHistory(goalId, hiddenGoalIds);
    setHiddenGoalIds(nextHiddenGoalIds);
    saveHiddenHistoryGoalIds(nextHiddenGoalIds);
    setHistoryActionMessage(`Hidden "${goalTitle}" from gallery.`);
    setHidingGoalId(null);
  };

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 pb-[max(6.5rem,env(safe-area-inset-bottom))]">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Images className="h-7 w-7 text-prove-600 dark:text-prove-400" />
            Goal gallery
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            {plan.name} plan · Browse your verified proofs goal by goal
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {enabledSettingCount}/4 gallery display options enabled
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
              Goal gallery is a paid plan feature
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Upgrade to Pro or Premium to browse your proof gallery and streak timelines.
            </p>
            <Link
              href="/pricing"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-prove-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-prove-700"
            >
              View plans
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <>
            {byGoal.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900/50">
                <Images className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500" />
                <p className="mt-4 text-slate-600 dark:text-slate-400">
                  No completed proofs yet. Prove it for your goals to fill your gallery.
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
                <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                  <label className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Choose goal
                  </label>
                  <select
                    value={selectedGoalId}
                    onChange={(e) => setSelectedGoalId(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-prove-500 focus:outline-none focus:ring-2 focus:ring-prove-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="all">All goals</option>
                    {byGoal.map((entry) => (
                      <option key={entry.goal.id} value={entry.goal.id}>
                        {entry.goal.title}
                      </option>
                    ))}
                  </select>
                </div>

                {historyActionMessage && (
                  <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    {historyActionMessage}
                  </p>
                )}

                {filteredGoals.map(({ goal, completedDates, subsByDate, streak }) => (
                  <section
                    key={goal.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {goal.frequency === "daily" ? (
                          <Sun className="h-5 w-5 shrink-0 text-amber-500" />
                        ) : (
                          <Calendar className="h-5 w-5 shrink-0 text-prove-500" />
                        )}
                        <div>
                          <h3 className="truncate font-semibold text-slate-900 dark:text-white">
                            {goal.title}
                          </h3>
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
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
                      <button
                        type="button"
                        onClick={() => handleHideGoalFromHistory(goal.id, goal.title)}
                        disabled={hidingGoalId === goal.id}
                        title="Hide from gallery"
                        aria-label={`Hide ${goal.title} from gallery`}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-70 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {historySettings.showProofPhotos ? (
                      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {completedDates.slice(0, 24).map((dateStr) => {
                          const d = safeParseISO(dateStr);
                          const label = d ? format(d, "MMM d, yyyy") : dateStr;
                          const isThisWeekDate = d ? isThisWeek(d) : false;
                          const sub = subsByDate.get(dateStr);
                          const hasImage = !!(sub?.imageDataUrl && sub.imageDataUrl.length > 10);

                          return (
                            <li
                              key={dateStr}
                              className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/50"
                            >
                              <div className="aspect-square overflow-hidden rounded-md bg-slate-200 dark:bg-slate-700">
                                {hasImage ? (
                                  <img src={sub!.imageDataUrl} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center">
                                    <CheckCircle2 className="h-6 w-6 text-prove-500" />
                                  </div>
                                )}
                              </div>
                              <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                                {label}
                                {historySettings.showThisWeekBadge && isThisWeekDate && (
                                  <span className="ml-1 rounded bg-prove-100 px-1 py-0.5 text-[10px] font-medium text-prove-700 dark:bg-prove-900/80 dark:text-prove-300">
                                    This week
                                  </span>
                                )}
                              </p>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <ul className="mt-4 flex flex-wrap gap-2">
                        {completedDates.slice(0, 24).map((dateStr) => {
                          const d = safeParseISO(dateStr);
                          const label = d ? format(d, "MMM d") : dateStr;
                          return (
                            <li
                              key={dateStr}
                              className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            >
                              {label}
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    {completedDates.length > 24 && (
                      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                        + {completedDates.length - 24} more completed
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
  return <GalleryContent />;
}
