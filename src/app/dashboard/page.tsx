"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Flame,
  ShieldCheck,
  ChevronRight,
  Target,
  CheckCircle2,
  Camera,
  ChevronDown,
  Users,
} from "lucide-react";
import clsx from "clsx";
import { useApp } from "@/context/AppContext";
import { DashboardTour } from "@/components/DashboardTour";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { GardenSnapshot } from "@/components/GardenSnapshot";
import { PullToRefresh } from "@/components/PullToRefresh";
import { PlanDowngradeReview } from "@/components/PlanDowngradeReview";
import { ShareImageButton } from "@/components/ShareImageButton";
import { getPlan } from "@/lib/store";
import { PLANS, normalizePlanId } from "@/types";
import { clearPostPlanWelcomeFlag } from "@/lib/postPlanWelcome";
import { consumeWateredGoalFlash } from "@/lib/wateredGoalFlash";
import { progressShareFilename, renderProgressShareImage } from "@/lib/shareProgressImage";
import { shareOrDownloadBlob } from "@/lib/shareImage";
import { hasCreatorAccess } from "@/lib/accountAccess";
import {
  applyDeveloperModeNumbers,
  applyGoalStreakOverride,
  DEFAULT_DEVELOPER_MODE_SETTINGS,
  getStoredDeveloperModeSettings,
  type DeveloperModeSettings,
} from "@/lib/developerMode";
import { extractCalendarDateKey, safeParseISO } from "@/lib/dateUtils";
import {
  countVerifiedInCalendarWeek,
  getNextDueLabel,
  getSubmissionWindowMessage,
  hasVerifiedSubmissionOnDate,
  isDashboardGoalComplete,
  isGoalDue,
  isWithinSubmissionWindow,
} from "@/lib/goalDue";
import { effectiveTimesPerWeek } from "@/lib/goalSchedule";
import { format, isThisWeek } from "date-fns";
import { getGoalStreak, isGoalDoneInCurrentWindow } from "@/lib/goalProgress";
import { getPlantStageForStreak } from "@/lib/plantGrowth";
import { getWeeklyPlantState, plantWateringLevelForState } from "@/lib/plantState";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    user,
    authReady,
    hasSelectedPlan,
    goals,
    submissions,
    graceDayEvents,
    getSubmissionsForGoal,
    checkAndAwardItems,
    markGoalDone,
    getGoalPlantVariant,
    setUser,
  } = useApp();
  const [creatorActionBusy, setCreatorActionBusy] = useState(false);
  const [creatorActionResult, setCreatorActionResult] = useState<string | null>(null);
  const [developerSettings, setDeveloperSettings] = useState<DeveloperModeSettings>(DEFAULT_DEVELOPER_MODE_SETTINGS);
  const [streakCardExpanded, setStreakCardExpanded] = useState(false);
  const [progressShareNotice, setProgressShareNotice] = useState<string | null>(null);
  const [wateredFlashGoalId, setWateredFlashGoalId] = useState<string | null>(null);
  const [checkoutBanner, setCheckoutBanner] = useState<string | null>(null);

  useEffect(() => {
    const goalId = consumeWateredGoalFlash();
    if (!goalId) return;
    setWateredFlashGoalId(goalId);
    const timer = window.setTimeout(() => setWateredFlashGoalId(null), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    clearPostPlanWelcomeFlag();
  }, []);

  useEffect(() => {
    if (searchParams.get("checkout") !== "success") return;
    const planParam = normalizePlanId(searchParams.get("plan"));
    const planName = PLANS.find((p) => p.id === planParam)?.name ?? "Pro";
    setCheckoutBanner(`Welcome to ${planName}! Your subscription is active.`);

    fetch("/api/profile", { credentials: "include" })
      .then((r) => r.json())
      .then((data: { profile?: Record<string, unknown> }) => {
        const p = data.profile;
        if (!p || !user) return;
        setUser({
          ...user,
          plan: normalizePlanId(p.plan),
          planBilling:
            typeof p.planBilling === "string" ? (p.planBilling as "monthly" | "yearly") : user.planBilling,
          trialExpiredNeedsReview: p.trialExpiredNeedsReview === true,
        });
      })
      .catch(() => {
        /* profile refresh is best-effort after checkout */
      });

    router.replace("/dashboard");
  }, [router, searchParams, setUser, user?.id]);

  const thisWeekVerified = submissions.filter((s) => {
    if (s.status !== "verified") return false;
    const d = safeParseISO(s.date);
    return d ? isThisWeek(d, { weekStartsOn: 0 }) : false;
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
  const dailyRhythmGoals = goals.filter((g) => effectiveTimesPerWeek(g) >= 7);
  const weeklyRhythmGoals = goals.filter((g) => effectiveTimesPerWeek(g) < 7);
  const streakUnit = "week";
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const isCreatorAccount = hasCreatorAccess(user?.email, user?.contactEmail);
  const effectiveDeveloperSettings = isCreatorAccount
    ? developerSettings
    : DEFAULT_DEVELOPER_MODE_SETTINGS;

  const isGoalCompletedInCurrentWindow = (goal: (typeof goals)[number]) =>
    isGoalDoneInCurrentWindow(goal, getSubmissionsForGoal, todayStr);

  const goalStreaks = goals.map((goal) => {
    const actualStreak = getGoalStreak(goal, getSubmissionsForGoal, graceDayEvents);
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

  const goalsDueToday = goals.filter((g) => isGoalDue(g, new Date(), getSubmissionsForGoal(g.id)));
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
  }, [authReady, user, hasSelectedPlan, router]);

  if (!authReady || !user || !hasSelectedPlan) {
    return <DashboardSkeleton />;
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
    const due = isGoalDue(entry.goal, new Date(), getSubmissionsForGoal(entry.goal.id));
    const watered = isGoalCompletedInCurrentWindow(entry.goal);
    const healthState = getWeeklyPlantState(
      entry.goal,
      getSubmissionsForGoal(entry.goal.id),
      graceDayEvents
    );
    return {
      id: entry.goal.id,
      stage: getPlantStageForStreak(entry.displayStreak).stage,
      wateringLevel: watered ? 1 : due ? plantWateringLevelForState(healthState) : 0.62,
      variant: getGoalPlantVariant(entry.goal.id),
      healthState,
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
    <PullToRefresh>
      <DashboardTour />
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-5 px-4 py-6 pb-[max(6.5rem,env(safe-area-inset-bottom))] sm:py-8">
        {checkoutBanner && (
          <div
            className="rounded-2xl border border-prove-200/90 bg-prove-50/90 px-4 py-3 text-sm text-prove-900 dark:border-prove-700/60 dark:bg-prove-950/35 dark:text-prove-100"
            role="status"
          >
            <span className="font-semibold">{checkoutBanner}</span>
          </div>
        )}
        <PlanDowngradeReview />
        <div className="mb-5">
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Dashboard
          </h1>
        </div>

        <section className="rounded-2xl border border-emerald-200/70 p-4 dark:border-emerald-800/45 glass-card">
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
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 btn-glass-primary"
            >
              Open Garden
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <GardenSnapshot
            plants={gardenSnapshotPlants}
            className="mt-3"
            highlightGoalId={wateredFlashGoalId}
          />
          <p className="mt-3 text-xs text-emerald-800 dark:text-emerald-200">
            {goals.length === 0 ? (
              "Add goals in the Garden to start tracking streaks and watering."
            ) : displayTotalDueToday === 0 ? (
              "Nothing to prove right now — add goals in the Garden or check back after your daily reminder."
            ) : (
              <>
                Proved today: {displayGoalsDoneToday}/{displayTotalDueToday} · Top streak: {displayMaxStreak}
              </>
            )}
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200/70 p-4 dark:border-slate-700/60 glass-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                Friend goals
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Invite someone to the same goal and see each other&apos;s weekly progress.
              </p>
            </div>
            <Link
              href="/friends"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-200/90 bg-emerald-50/80 px-4 py-2.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-100/90 dark:border-emerald-800/80 dark:bg-emerald-950/40 dark:text-emerald-100"
            >
              <Users className="h-4 w-4" />
              View friends
            </Link>
          </div>
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
          <div className="mt-4 rounded-2xl p-5 glass-card">
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
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-prove-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-prove-700 btn-glass-primary"
              >
                Open Garden
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <div className="rounded-2xl p-5 glass-card">
              <button
                type="button"
                onClick={() => setStreakCardExpanded((e) => !e)}
                className="flex w-full items-center justify-between gap-2 text-left"
                aria-expanded={streakCardExpanded}
              >
                <div className="flex items-center gap-2">
                  {graceDayEvents.length > 0 ? (
                    <ShieldCheck className="h-5 w-5 text-slate-400" />
                  ) : (
                    <Flame className="h-5 w-5 text-amber-500" />
                  )}
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Current streak
                  </span>
                </div>
                <ChevronDown
                  className={clsx("h-5 w-5 shrink-0 text-slate-400 transition", streakCardExpanded && "rotate-180")}
                />
              </button>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                {displayMaxStreak} {displayMaxStreak === 1 ? streakUnit : `${streakUnit}s`}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {isCreatorAccount && effectiveDeveloperSettings.enabled
                  ? "Developer mode preview is active."
                  : displayMaxStreak === 0
                    ? "Complete a goal to start your streak."
                    : "Keep submitting verified proofs to grow your streak."}
              </p>
              {displayMaxStreak > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <ShareImageButton
                    label="Share progress"
                    onShare={async () => {
                      const blob = await renderProgressShareImage({
                        maxStreak: displayMaxStreak,
                        streakUnit,
                        goalsDoneToday: displayGoalsDoneToday,
                        totalDueToday: displayTotalDueToday,
                        activeGoals: goals.length,
                        gardenPlants: gardenSnapshotPlants.map(({ stage, variant }) => ({
                          stage,
                          variant,
                        })),
                      });
                      return shareOrDownloadBlob(
                        blob,
                        progressShareFilename(),
                        "Proveit progress",
                        `I'm on a ${displayMaxStreak} ${streakUnit} streak on Proveit! 🌱`
                      );
                    }}
                    onDone={(result) =>
                      setProgressShareNotice(
                        result === "shared" ? "Progress shared!" : "Progress image saved."
                      )
                    }
                    onError={setProgressShareNotice}
                  />
                  {progressShareNotice && (
                    <span className="text-xs text-prove-700 dark:text-prove-300" role="status">
                      {progressShareNotice}
                    </span>
                  )}
                </div>
              )}
              {streakCardExpanded && (
                <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
                  <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">This week</p>
                  <div className="flex flex-wrap gap-2">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <div
                        key={day}
                        className="flex flex-col items-center rounded-lg bg-slate-50 px-2.5 py-1.5 dark:bg-slate-800/50"
                      >
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{day}</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {weeklyByDay[day] ?? 0}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <section className="mt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                Today&apos;s goals
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {goals.length} goal{goals.length !== 1 ? "s" : ""} ·{" "}
                {plan?.maxGoals === -1
                  ? "Unlimited on your plan"
                  : `${plan?.maxGoals ?? 0} max on your plan`}
              </p>
            </div>
            <Link
              href="/buddy"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-prove-500 bg-prove-50 px-4 py-2.5 text-sm font-semibold text-prove-700 hover:bg-prove-100 dark:border-prove-400 dark:bg-prove-950/50 dark:text-prove-300 dark:hover:bg-prove-900/50 btn-glass-outline"
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
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-prove-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-prove-700 btn-glass-primary"
              >
                <Plus className="h-4 w-4" />
                Add your first goal
              </Link>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {[...dailyRhythmGoals, ...weeklyRhythmGoals].map((goal) => {
                const subs = getSubmissionsForGoal(goal.id);
                const now = new Date();
                const tw = effectiveTimesPerWeek(goal);
                const weekVerifiedCount = countVerifiedInCalendarWeek(subs, now);
                const doneToday = hasVerifiedSubmissionOnDate(subs, todayStr);
                const weekMet = weekVerifiedCount >= tw;
                const showComplete = isDashboardGoalComplete(goal, subs, now);
                const todayVerifiedSub = subs.find(
                  (s) =>
                    s.status === "verified" &&
                    extractCalendarDateKey(s.date) === todayStr &&
                    s.imageDataUrl
                );
                const weekVerifiedSub = subs.find((s) => {
                  const d = safeParseISO(s.date);
                  return (
                    !!d &&
                    isThisWeek(d, { weekStartsOn: 0 }) &&
                    s.status === "verified" &&
                    !!s.imageDataUrl
                  );
                });
                const displayProofSub = todayVerifiedSub ?? weekVerifiedSub;
                const pendingSub = subs.find((s) => {
                  const d = safeParseISO(s.date);
                  return !!d && isThisWeek(d, { weekStartsOn: 0 }) && s.imageDataUrl;
                });
                const canSubmitNow = isWithinSubmissionWindow(goal, now, subs);
                const due = isGoalDue(goal, now, subs);
                const dueLabel = getNextDueLabel(goal);
                const cadenceLabel =
                  tw >= 7
                    ? "Daily"
                    : `Weekly · ${weekVerifiedCount}/${tw} this week${weekMet ? " · Done for the week" : doneToday ? " · Done today" : ""}`;
                return (
                  <li
                    key={goal.id}
                    className="flex items-center justify-between rounded-xl p-4 glass-card"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {showComplete ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-prove-500" />
                      ) : (
                        <div className="h-5 w-5 shrink-0 rounded-full border-2 border-slate-300 dark:border-slate-600" />
                      )}
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {goal.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {cadenceLabel}
                          {" · Streak: "}
                          {(displayStreakByGoalId.get(goal.id) ?? 0) > 0
                            ? `${displayStreakByGoalId.get(goal.id)} weeks`
                            : "—"}
                          {goal.isOnBreak ? " · On break" : ""}
                          {tw < 7 && !due && dueLabel && !weekMet ? ` · ${dueLabel}` : ""}
                        </p>
                      </div>
                    </div>
                    {goal.isOnBreak ? (
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                        On break
                      </span>
                    ) : showComplete && displayProofSub?.imageDataUrl ? (
                      <Link
                        href={`/goals/submit?goalId=${goal.id}`}
                        className="block h-11 w-11 shrink-0 overflow-hidden rounded-xl ring-2 ring-prove-400/90 dark:ring-prove-500/70"
                        aria-label={
                          doneToday
                            ? `View today's proof for ${goal.title}`
                            : `View this week's proof for ${goal.title}`
                        }
                      >
                        <img
                          src={displayProofSub.imageDataUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </Link>
                    ) : showComplete ? (
                      <span className="text-sm font-medium text-prove-600 dark:text-prove-400">
                        Done
                      </span>
                    ) : canSubmitNow && pendingSub?.imageDataUrl ? (
                      <Link
                        href={`/goals/submit?goalId=${goal.id}`}
                        className="block h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600"
                        aria-label="View or change proof"
                      >
                        <img
                          src={pendingSub.imageDataUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </Link>
                    ) : canSubmitNow ? (
                      <Link
                        href={`/goals/submit?goalId=${goal.id}`}
                        className="flex items-center gap-1 rounded-lg bg-prove-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-prove-700 btn-glass-primary"
                      >
                        <Camera className="h-4 w-4" />
                        Prove it
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-500 dark:text-slate-400 max-w-[160px]">
                        {getSubmissionWindowMessage(goal, now, subs) ??
                          (tw < 7 ? `${weekVerifiedCount}/${tw} proofs this week` : "Not available")}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

      </main>
    </PullToRefresh>
  );
}

export default function DashboardPage() {
  return <DashboardContent />;
}
