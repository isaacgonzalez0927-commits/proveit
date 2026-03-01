"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { DashboardTour } from "@/components/DashboardTour";
import { GardenSnapshot } from "@/components/GardenSnapshot";
import { getPlan } from "@/lib/store";
import { hasCreatorAccess } from "@/lib/accountAccess";
import {
  applyDeveloperModeNumbers,
  applyGoalStreakOverride,
  DEFAULT_DEVELOPER_MODE_SETTINGS,
  getStoredDeveloperModeSettings,
  type DeveloperModeSettings,
} from "@/lib/developerMode";
import { safeParseISO } from "@/lib/dateUtils";
import { isGoalDue, getNextDueLabel, isWithinSubmissionWindow, getSubmissionWindowMessage } from "@/lib/goalDue";
import { format, isThisWeek } from "date-fns";
import { getGoalStreak, isGoalDoneInCurrentWindow } from "@/lib/goalProgress";
import { getPlantStageForStreak } from "@/lib/plantGrowth";

function DashboardContent() {
  const router = useRouter();
  const {
    user,
    authReady,
    hasSelectedPlan,
    goals,
    submissions,
    getSubmissionsForGoal,
    checkAndAwardItems,
    markGoalDone,
    getGoalPlantVariant,
  } = useApp();
  const [creatorActionBusy, setCreatorActionBusy] = useState(false);
  const [creatorActionResult, setCreatorActionResult] = useState<string | null>(null);
  const [developerSettings, setDeveloperSettings] = useState<DeveloperModeSettings>(DEFAULT_DEVELOPER_MODE_SETTINGS);
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

  const plan = user ? getPlan(user.plan) : null;
  const dailyGoals = goals.filter((g) => g.frequency === "daily");
  const weeklyGoals = goals.filter((g) => g.frequency === "weekly");
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const isCreatorAccount = hasCreatorAccess(user?.email);
  const effectiveDeveloperSettings = isCreatorAccount
    ? developerSettings
    : DEFAULT_DEVELOPER_MODE_SETTINGS;

  const isGoalCompletedInCurrentWindow = (goal: (typeof goals)[number]) =>
    isGoalDoneInCurrentWindow(goal, getSubmissionsForGoal, todayStr);

  const goalStreaks = goals.map((goal) => {
    const actualStreak = getGoalStreak(goal, getSubmissionsForGoal);
    const displayStreak = applyGoalStreakOverride(goal.id, actualStreak, effectiveDeveloperSettings);
    return { goal, actualStreak, displayStreak };
  });

  const realMaxStreak = goalStreaks.length
    ? Math.max(...goalStreaks.map((entry) => entry.actualStreak), 0)
    : 0;
  const maxStreak = goalStreaks.length
    ? Math.max(...goalStreaks.map((entry) => entry.displayStreak), 0)
    : 0;

  useEffect(() => {
    checkAndAwardItems(realMaxStreak);
  }, [realMaxStreak, submissions, checkAndAwardItems]);

  const goalsDueToday = goals.filter((g) => isGoalDue(g));
  const goalsDoneToday = goalsDueToday.filter(isGoalCompletedInCurrentWindow).length;

  useEffect(() => {
    const stored = getStoredDeveloperModeSettings();
    setDeveloperSettings(stored);
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      router.replace("/");
      return;
    }
    if (!hasSelectedPlan) {
      router.replace("/?step=plan");
    }
  }, [authReady, user, hasSelectedPlan, router]);

  if (!authReady || !user || !hasSelectedPlan) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white dark:bg-black">
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading your dashboard…</p>
      </main>
    );
  }

  const creatorPendingDueGoals = goalsDueToday.filter((g) => !isGoalCompletedInCurrentWindow(g));
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
  const displayStreakByGoalId = new Map(goalStreaks.map((entry) => [entry.goal.id, entry.displayStreak]));
  const sortedGoalStreaks = [...goalStreaks].sort((a, b) => b.displayStreak - a.displayStreak);
  const gardenSnapshotPlants = sortedGoalStreaks.map((entry) => {
    const due = isGoalDue(entry.goal);
    const watered = isGoalCompletedInCurrentWindow(entry.goal);
    return {
      id: entry.goal.id,
      stage: getPlantStageForStreak(entry.displayStreak).stage,
      wateringLevel: watered ? 1 : due ? 0.18 : 0.62,
      variant: getGoalPlantVariant(entry.goal.id),
    };
  });

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

  return (
    <>
      <Header />
      <DashboardTour />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 pb-[max(6.5rem,env(safe-area-inset-bottom))]">
        <div className="mb-5">
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Dashboard
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            {(user?.name || user?.email) ?? ""} · {plan?.name} plan
          </p>
        </div>

        <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-cyan-50/40 p-4 dark:border-emerald-900/60 dark:from-emerald-950/25 dark:to-cyan-950/20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                Garden snapshot
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                All your plants together, growing goal by goal.
              </p>
            </div>
            <Link
              href="/buddy"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            >
              Open Garden
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <GardenSnapshot plants={gardenSnapshotPlants} className="mt-3" />
          <p className="mt-3 text-xs text-emerald-800 dark:text-emerald-200">
            {goals.length === 0 ? (
              "Add goals in the Garden to start tracking streaks and watering."
            ) : displayTotalDueToday === 0 ? (
              "No goals due today — add more in the Garden or check back on due days."
            ) : (
              <>
                Watered today: {displayGoalsDoneToday}/{displayTotalDueToday} · Top streak:{" "}
                {displayMaxStreak} day{displayMaxStreak === 1 ? "" : "s"}
              </>
            )}
          </p>
        </section>

        {isCreatorAccount && effectiveDeveloperSettings.enabled && (
          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-800/60 dark:bg-amber-950/20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Creator tools (private)
                </p>
                <p className="text-xs text-amber-800/90 dark:text-amber-300/90">
                  This section is only visible to creator accounts.
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
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Developer tools
              </p>
              <p className="mt-1 text-xs text-amber-800/90 dark:text-amber-300/90">
                Turn developer tools on/off from Settings only.
              </p>
              <p className="mt-1 text-xs text-amber-800/90 dark:text-amber-300/90">
                Current status: ON.
              </p>
              <Link
                href="/settings"
                className="mt-3 inline-flex rounded-md border border-amber-400 px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/40"
              >
                Open Settings
              </Link>
            </div>
          </section>
        )}

        {goals.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
              <div className="flex gap-3">
                <Flame className="h-8 w-8 shrink-0 text-amber-500" />
                <Target className="h-8 w-8 shrink-0 text-prove-500" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">
                  You’re all set — add your first goal
                </p>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  Create a daily or weekly goal in the Garden to start proving it and growing streaks.
                </p>
              </div>
              <Link
                href="/buddy"
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-prove-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-prove-700"
              >
                Open Garden
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
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
                {isCreatorAccount && effectiveDeveloperSettings.enabled
                  ? "Developer mode preview is active."
                  : displayMaxStreak === 0
                    ? "Complete a goal to start your streak."
                    : "Keep submitting verified proofs to grow your streak."}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-prove-600 dark:text-prove-400" />
                <span className="font-semibold text-slate-900 dark:text-white">
                  Goals
                </span>
              </div>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                {goals.length}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {dailyGoals.length} daily, {weeklyGoals.length} weekly
              </p>
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                {plan?.dailyGoals === -1 ? "Unlimited" : plan?.dailyGoals} daily,{" "}
                {plan?.weeklyGoals === -1 ? "Unlimited" : plan?.weeklyGoals} weekly on your plan.
              </p>
            </div>
          </div>
        )}

        <section className="mt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Today&apos;s goals
            </h2>
            <Link
              href="/buddy"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-prove-500 bg-prove-50 px-4 py-2.5 text-sm font-semibold text-prove-700 hover:bg-prove-100 dark:border-prove-400 dark:bg-prove-950/50 dark:text-prove-300 dark:hover:bg-prove-900/50"
            >
              Manage in Garden
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {goals.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900/50">
              <p className="text-base font-medium text-slate-700 dark:text-slate-300">
                No goals yet
              </p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Add a daily or weekly goal in the Garden to see today’s tasks and start building your streak.
              </p>
              <Link
                href="/buddy"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-prove-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-prove-700"
              >
                <Plus className="h-4 w-4" />
                Add your first goal
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
                          Daily · Streak: {(displayStreakByGoalId.get(goal.id) ?? 0) > 0
                            ? `${displayStreakByGoalId.get(goal.id)} days`
                            : "—"}
                          {goal.isOnBreak ? " · On break" : ""}
                        </p>
                      </div>
                    </div>
                    {goal.isOnBreak ? (
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                        On break
                      </span>
                    ) : verified ? (
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
                        Prove it
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
                const canSubmitNow = isWithinSubmissionWindow(goal);
                const windowMessage = getSubmissionWindowMessage(goal);
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
                          Weekly · Streak: {(displayStreakByGoalId.get(goal.id) ?? 0) > 0
                            ? `${displayStreakByGoalId.get(goal.id)} weeks`
                            : "—"}
                          {goal.isOnBreak ? " · On break" : ""}
                          {!due && dueLabel && ` · ${dueLabel}`}
                        </p>
                      </div>
                    </div>
                    {goal.isOnBreak ? (
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                        On break
                      </span>
                    ) : thisWeekProof ? (
                      <span className="flex items-center gap-1 text-sm text-prove-600 dark:text-prove-400">
                        <CheckCircle2 className="h-4 w-4" />
                        Done
                      </span>
                    ) : canSubmitNow ? (
                      <Link
                        href={`/goals/submit?goalId=${goal.id}`}
                        className="flex items-center gap-1 rounded-lg bg-prove-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-prove-700"
                      >
                        <Camera className="h-4 w-4" />
                        Prove it
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-500 dark:text-slate-400 max-w-[160px]">
                        {windowMessage ?? dueLabel ?? "Not due yet"}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="mt-6">
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
                  {thisWeekVerified.length === 0
                    ? "Complete a goal this week to see your recap here."
                    : "goals completed this week"}
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
          Want more goals or Goal Gallery access? Upgrade to Pro →
        </Link>
      </main>
    </>
  );
}

export default function DashboardPage() {
  return <DashboardContent />;
}
