"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Flame,
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
import { hasCreatorAccess } from "@/lib/accountAccess";
import {
  applyDeveloperModeNumbers,
  DEFAULT_DEVELOPER_MODE_SETTINGS,
  getStoredDeveloperModeSettings,
  saveDeveloperModeSettings,
  type DeveloperModeSettings,
} from "@/lib/developerMode";
import { safeParseISO } from "@/lib/dateUtils";
import { isGoalDue, getNextDueLabel, isWithinSubmissionWindow, getSubmissionWindowMessage } from "@/lib/goalDue";
import { format, isThisWeek } from "date-fns";

function DashboardContent() {
  const { user, goals, submissions, getSubmissionsForGoal, checkAndAwardItems, markGoalDone } = useApp();
  const [creatorActionBusy, setCreatorActionBusy] = useState(false);
  const [creatorActionResult, setCreatorActionResult] = useState<string | null>(null);
  const [developerModeMessage, setDeveloperModeMessage] = useState<string | null>(null);
  const [developerSettings, setDeveloperSettings] = useState<DeveloperModeSettings>(DEFAULT_DEVELOPER_MODE_SETTINGS);
  const [developerDraft, setDeveloperDraft] = useState({
    streak: "",
    goalsDoneToday: "",
    totalDueToday: "",
  });
  const thisWeekVerified = submissions.filter((s) => {
    if (s.status !== "verified") return false;
    const d = safeParseISO(s.date);
    return d ? isThisWeek(d) : false;
  });
  const weeklyByDay = (() => {
    const dayCount: Record<string, number> = {};
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    days.forEach((d) => { dayCount[d] = 0; });
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    for (const s of thisWeekVerified) {
      const d = safeParseISO(s.date);
      if (!d) continue;
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

  const isGoalCompletedInCurrentWindow = (goal: (typeof goals)[number]) => {
    const subs = getSubmissionsForGoal(goal.id);
    if (goal.frequency === "daily") {
      return subs.some((s) => s.date === todayStr && s.status === "verified");
    }
    return subs.some((s) => {
      const d = safeParseISO(s.date);
      return !!d && isThisWeek(d) && s.status === "verified";
    });
  };

  useEffect(() => {
    checkAndAwardItems(maxStreak);
  }, [maxStreak, submissions, checkAndAwardItems]);

  const goalsDueToday = goals.filter((g) => isGoalDue(g));
  const goalsDoneToday = goalsDueToday.filter(isGoalCompletedInCurrentWindow).length;
  const isCreatorAccount = hasCreatorAccess(user.email);
  const toDeveloperDraft = (settings: DeveloperModeSettings) => ({
    streak: settings.overrideMaxStreak == null ? "" : String(settings.overrideMaxStreak),
    goalsDoneToday:
      settings.overrideGoalsDoneToday == null ? "" : String(settings.overrideGoalsDoneToday),
    totalDueToday:
      settings.overrideTotalDueToday == null ? "" : String(settings.overrideTotalDueToday),
  });

  useEffect(() => {
    const stored = getStoredDeveloperModeSettings();
    setDeveloperSettings(stored);
    setDeveloperDraft(toDeveloperDraft(stored));
  }, []);

  const creatorPendingDueGoals = goalsDueToday.filter((g) => !isGoalCompletedInCurrentWindow(g));
  const effectiveDeveloperSettings = isCreatorAccount
    ? developerSettings
    : DEFAULT_DEVELOPER_MODE_SETTINGS;
  const displayProgress = applyDeveloperModeNumbers(
    {
      maxStreak,
      goalsDoneToday,
      totalDueToday: goalsDueToday.length,
    },
    effectiveDeveloperSettings
  );
  const displayMaxStreak = displayProgress.maxStreak;
  const displayGoalsDoneToday = displayProgress.goalsDoneToday;
  const displayTotalDueToday = displayProgress.totalDueToday;

  const handleCreatorWaterAllDueGoals = async () => {
    if (creatorActionBusy) return;
    setCreatorActionBusy(true);
    setCreatorActionResult(null);
    let watered = 0;
    try {
      for (const goal of creatorPendingDueGoals) {
        await markGoalDone(goal.id);
        watered += 1;
      }
      if (watered === 0) {
        setCreatorActionResult("All due goals were already watered.");
      } else {
        setCreatorActionResult(`Watered ${watered} due goal${watered === 1 ? "" : "s"}.`);
      }
    } finally {
      setCreatorActionBusy(false);
    }
  };

  const parseOverride = (value: string): number | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return parsed;
  };

  const persistDeveloperSettings = (next: DeveloperModeSettings) => {
    setDeveloperSettings(next);
    saveDeveloperModeSettings(next);
  };

  const handleDeveloperToggle = (enabled: boolean) => {
    const next = { ...developerSettings, enabled };
    persistDeveloperSettings(next);
    setDeveloperModeMessage(enabled ? "Developer mode enabled." : "Developer mode disabled.");
  };

  const handleDeveloperDraftChange = (
    field: "streak" | "goalsDoneToday" | "totalDueToday",
    value: string
  ) => {
    const cleaned = value.replace(/[^\d]/g, "");
    setDeveloperDraft((prev) => ({ ...prev, [field]: cleaned }));
  };

  const applyDeveloperModeOverrides = () => {
    const next: DeveloperModeSettings = {
      ...developerSettings,
      overrideMaxStreak: parseOverride(developerDraft.streak),
      overrideGoalsDoneToday: parseOverride(developerDraft.goalsDoneToday),
      overrideTotalDueToday: parseOverride(developerDraft.totalDueToday),
    };
    persistDeveloperSettings(next);
    setDeveloperModeMessage("Developer test values saved.");
  };

  const clearDeveloperModeOverrides = () => {
    const next: DeveloperModeSettings = {
      ...developerSettings,
      overrideMaxStreak: null,
      overrideGoalsDoneToday: null,
      overrideTotalDueToday: null,
    };
    persistDeveloperSettings(next);
    setDeveloperDraft(toDeveloperDraft(next));
    setDeveloperModeMessage("Developer test values cleared.");
  };

  const setDeveloperStreakPreset = (value: number) => {
    const nextDraft = { ...developerDraft, streak: String(value) };
    setDeveloperDraft(nextDraft);
    const next: DeveloperModeSettings = {
      ...developerSettings,
      enabled: true,
      overrideMaxStreak: value,
      overrideGoalsDoneToday: parseOverride(nextDraft.goalsDoneToday),
      overrideTotalDueToday: parseOverride(nextDraft.totalDueToday),
    };
    persistDeveloperSettings(next);
    setDeveloperModeMessage(`Streak preset set to ${value}.`);
  };

  return (
    <>
      <NotificationScheduler />
      <Header />
      <DashboardTour />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 pb-[max(6.5rem,env(safe-area-inset-bottom))]">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Dashboard
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            {user?.email} · {plan?.name} plan
          </p>
        </div>

        <AccountabilityBuddy
          maxStreak={displayMaxStreak}
          goalsDoneToday={displayGoalsDoneToday}
          totalDueToday={displayTotalDueToday}
        />

        {isCreatorAccount && (
          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-800/60 dark:bg-amber-950/20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Creator tools (private)
                </p>
                <p className="text-xs text-amber-800/90 dark:text-amber-300/90">
                  This section is only visible to isaacgonzalez0927@gmail.com.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCreatorWaterAllDueGoals}
                disabled={creatorActionBusy}
                className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {creatorActionBusy
                  ? "Watering..."
                  : `Water all due goals (${creatorPendingDueGoals.length})`}
              </button>
            </div>
            {creatorActionResult && (
              <p className="mt-3 text-xs text-amber-900 dark:text-amber-200">{creatorActionResult}</p>
            )}
            <div className="mt-4 border-t border-amber-300/50 pt-4 dark:border-amber-700/50">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                    Developer mode preview
                  </p>
                  <p className="text-xs text-amber-800/90 dark:text-amber-300/90">
                    Override streak and watering numbers without changing real account data.
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-amber-900 dark:text-amber-200">
                  <input
                    type="checkbox"
                    checked={developerSettings.enabled}
                    onChange={(e) => handleDeveloperToggle(e.target.checked)}
                    className="h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                  />
                  {developerSettings.enabled ? "Enabled" : "Disabled"}
                </label>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {[0, 7, 14, 30, 60, 100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDeveloperStreakPreset(preset)}
                    className="rounded-md border border-amber-300 bg-white/70 px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-white dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-900/40"
                  >
                    Streak {preset}
                  </button>
                ))}
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label className="text-xs text-amber-900 dark:text-amber-200">
                  Streak override
                  <input
                    type="text"
                    inputMode="numeric"
                    value={developerDraft.streak}
                    onChange={(e) => handleDeveloperDraftChange("streak", e.target.value)}
                    placeholder="Real streak"
                    className="mt-1 w-full rounded-md border border-amber-300 bg-white px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-500 dark:border-amber-700 dark:bg-amber-950/40 dark:text-white"
                  />
                </label>
                <label className="text-xs text-amber-900 dark:text-amber-200">
                  Goals done today
                  <input
                    type="text"
                    inputMode="numeric"
                    value={developerDraft.goalsDoneToday}
                    onChange={(e) => handleDeveloperDraftChange("goalsDoneToday", e.target.value)}
                    placeholder="Real done count"
                    className="mt-1 w-full rounded-md border border-amber-300 bg-white px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-500 dark:border-amber-700 dark:bg-amber-950/40 dark:text-white"
                  />
                </label>
                <label className="text-xs text-amber-900 dark:text-amber-200">
                  Goals due today
                  <input
                    type="text"
                    inputMode="numeric"
                    value={developerDraft.totalDueToday}
                    onChange={(e) => handleDeveloperDraftChange("totalDueToday", e.target.value)}
                    placeholder="Real due count"
                    className="mt-1 w-full rounded-md border border-amber-300 bg-white px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-500 dark:border-amber-700 dark:bg-amber-950/40 dark:text-white"
                  />
                </label>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={applyDeveloperModeOverrides}
                  disabled={!developerSettings.enabled}
                  className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Apply test values
                </button>
                <button
                  type="button"
                  onClick={clearDeveloperModeOverrides}
                  className="rounded-md border border-amber-400 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/40"
                >
                  Clear overrides
                </button>
              </div>

              <p className="mt-3 text-xs text-amber-900 dark:text-amber-200">
                Preview values: streak {displayMaxStreak} · watered {displayGoalsDoneToday}/{displayTotalDueToday}
              </p>
              {developerModeMessage && (
                <p className="mt-1 text-xs text-amber-900 dark:text-amber-200">{developerModeMessage}</p>
              )}
            </div>
          </section>
        )}

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-amber-500" />
              <span className="font-semibold text-slate-900 dark:text-white">
                Current streak
              </span>
            </div>
            <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
              {displayMaxStreak} {displayMaxStreak === 1 ? "day" : "days"}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {effectiveDeveloperSettings.enabled
                ? "Developer mode preview is active."
                : "Keep submitting verified proofs to grow your streak."}
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
                  const d = safeParseISO(s.date);
                  return !!d && isThisWeek(d) && s.status === "verified";
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
                Keep it up! Your plant gets healthier with every completed goal.
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
