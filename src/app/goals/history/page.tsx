"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Images,
  CheckCircle2,
  Calendar,
  Sun,
  ChevronRight,
  ChevronLeft,
  Lock,
  Flame,
  Trash2,
  Grid3X3,
  LayoutGrid,
  Award,
  Crown,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { safeParseISO } from "@/lib/dateUtils";
import { addMonths, format, getDay, getDaysInMonth, isSameMonth, isThisWeek, startOfMonth } from "date-fns";
import { getGoalStreak } from "@/lib/goalProgress";
import { getPlantStageForStreak } from "@/lib/plantGrowth";
import { isPremiumMember } from "@/lib/achievements";
import { buildWeeklyCollages } from "@/lib/weeklyCollage";
import { WeeklyCollageCard } from "@/components/WeeklyCollageCard";
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
  const { user, goals, submissions, graceDayEvents, getSubmissionsForGoal, getGoalPlantVariant } = useApp();
  const [historySettings, setHistorySettings] = useState<HistoryDisplaySettings>(
    DEFAULT_HISTORY_DISPLAY_SETTINGS
  );
  const [historyActionMessage, setHistoryActionMessage] = useState<string | null>(null);
  const [hidingGoalId, setHidingGoalId] = useState<string | null>(null);
  const [hiddenGoalIds, setHiddenGoalIds] = useState<string[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "calendar" | "collages">("list");
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => startOfMonth(new Date()));

  useEffect(() => {
    setHistorySettings(getStoredHistoryDisplaySettings());
    setHiddenGoalIds(getStoredHiddenHistoryGoalIds());
  }, []);

  const isPro = user ? user.plan === "pro" || user.plan === "premium" : false;
  const isPremium = isPremiumMember(user);

  // Build gallery source: verified submissions grouped by goal, sorted by date
  const verifiedSubs = useMemo(() => {
    if (!user) return [];
    return submissions
      .filter((s) => s.status === "verified")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [user, submissions]);

  const weeklyCollages = useMemo(
    () => (isPremium ? buildWeeklyCollages(verifiedSubs, goals, { maxWeeks: 8 }) : []),
    [isPremium, verifiedSubs, goals]
  );

  const gardenSharePlants = useMemo(
    () =>
      goals
        .filter((goal) => !goal.archivedAt)
        .map((goal) => ({
          stage: getPlantStageForStreak(
            getGoalStreak(goal, getSubmissionsForGoal, graceDayEvents)
          ).stage,
          variant: getGoalPlantVariant(goal.id),
        })),
    [goals, graceDayEvents, getSubmissionsForGoal, getGoalPlantVariant, submissions]
  );

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
            streak: getGoalStreak(goal, getSubmissionsForGoal, graceDayEvents),
          };
        })
        .filter((g) => g.completedDates.length > 0 && !hiddenGoalIds.includes(g.goal.id)),
    [goals, verifiedSubs, hiddenGoalIds, getSubmissionsForGoal, graceDayEvents]
  );

  useEffect(() => {
    if (selectedGoalId === "all") return;
    const exists = byGoal.some((entry) => entry.goal.id === selectedGoalId);
    if (!exists) setSelectedGoalId("all");
  }, [selectedGoalId, byGoal]);

  const filteredGoals =
    selectedGoalId === "all" ? byGoal : byGoal.filter((entry) => entry.goal.id === selectedGoalId);
  const calendarProofByDate = useMemo(() => {
    const entries =
      selectedGoalId === "all"
        ? verifiedSubs
        : verifiedSubs.filter((submission) => submission.goalId === selectedGoalId);
    const map = new Map<string, (typeof entries)[number]>();
    for (const submission of entries) {
      const existing = map.get(submission.date);
      if (!existing || new Date(submission.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
        map.set(submission.date, submission);
      }
    }
    return map;
  }, [selectedGoalId, verifiedSubs]);

  const calendarGridDays = useMemo(() => {
    const first = startOfMonth(calendarMonth);
    const firstWeekDay = getDay(first);
    const daysInMonth = getDaysInMonth(first);
    return {
      monthStart: first,
      firstWeekDay,
      daysInMonth,
      leadingDays: Array.from({ length: firstWeekDay }, (_, i) => i),
      monthDays: Array.from({ length: daysInMonth }, (_, i) => i + 1),
    };
  }, [calendarMonth]);

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

  if (!user) {
    return (
      <>
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

  return (
    <>
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-6 pb-[max(6.5rem,env(safe-area-inset-bottom))] sm:py-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Images className="h-7 w-7 text-prove-600 dark:text-prove-400" />
              Goal gallery
            </h1>
          </div>
          {isPro && (
            <Link
              href="/friends#achievements"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200/80 px-3 py-2 text-xs font-semibold text-slate-700 shadow-soft transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Award className="h-4 w-4 text-prove-600 dark:text-prove-400" />
              Achievements
            </Link>
          )}
        </div>

        {!isPro ? (
          <div className="relative overflow-hidden rounded-2xl border border-emerald-200/85 bg-gradient-to-br from-emerald-50/95 via-white to-prove-50/75 p-6 dark:border-emerald-800/45 dark:from-emerald-950/40 dark:via-slate-900 dark:to-prove-950/25 sm:p-8">
            <div
              className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-200/45 blur-3xl dark:bg-emerald-800/25"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-prove-200/40 blur-2xl dark:bg-prove-800/20"
              aria-hidden
            />
            <div className="relative text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-prove-500 to-emerald-500 shadow-lg shadow-prove-600/25">
                <Images className="h-8 w-8 text-white" />
              </div>
              <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-200/90 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                <Lock className="h-3 w-3" />
                Pro & Premium
              </span>
              <h2 className="mt-4 font-display text-xl font-bold text-slate-900 dark:text-white">
                Your proof gallery is waiting
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                Every verified photo, streak timeline, and week-by-week win — all in one place when you upgrade.
              </p>
              <ul className="mx-auto mt-5 max-w-xs space-y-2 text-left text-sm text-slate-700 dark:text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  Browse proof photos by goal
                </li>
                <li className="flex items-start gap-2">
                  <Flame className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  Streak timelines & calendar view
                </li>
                <li className="flex items-start gap-2">
                  <Award className="mt-0.5 h-4 w-4 shrink-0 text-prove-500" />
                  Achievements tied to your gallery
                </li>
              </ul>
              <Link
                href="/pricing"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-prove-600 to-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-prove-600/20 transition hover:from-prove-700 hover:to-emerald-700 btn-glass-primary"
              >
                Unlock with Pro
                <ChevronRight className="h-4 w-4" />
              </Link>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-500">
                Free plan still includes dashboard, plants, and weekly growth.
              </p>
            </div>
          </div>
        ) : (
          <>
            {byGoal.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300/90 p-8 text-center dark:border-slate-600/70 glass-card">
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
                {isPremium && weeklyCollages.length > 0 && viewMode !== "calendar" && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between gap-3 px-1">
                      <div>
                        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">
                          <Crown className="h-3.5 w-3.5" />
                          Premium weekly collages
                        </p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                          Your proof photos grouped by week.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setViewMode("collages")}
                        className="text-xs font-semibold text-prove-600 hover:underline dark:text-prove-400"
                      >
                        View all
                      </button>
                    </div>
                    <WeeklyCollageCard collage={weeklyCollages[0]!} compact gardenPlants={gardenSharePlants} />
                  </section>
                )}

                {!isPremium && isPro && (
                  <div className="rounded-2xl border border-dashed border-amber-300/70 bg-amber-50/50 p-4 dark:border-amber-800/50 dark:bg-amber-950/15">
                    <p className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
                      <Crown className="h-4 w-4" />
                      Weekly photo collages are Premium
                    </p>
                    <p className="mt-1 text-sm text-amber-800/90 dark:text-amber-200/80">
                      Upgrade to Premium to auto-build weekly proof collages from your gallery.
                    </p>
                    <Link href="/pricing" className="mt-2 inline-block text-sm font-semibold text-prove-600 hover:underline dark:text-prove-400">
                      View Premium →
                    </Link>
                  </div>
                )}

                <div className="rounded-xl p-3 glass-card">
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
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setViewMode("list")}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                        viewMode === "list"
                          ? "bg-prove-600 text-white"
                          : "border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                    >
                      List
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("calendar")}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                        viewMode === "calendar"
                          ? "bg-prove-600 text-white"
                          : "border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                    >
                      <Grid3X3 className="h-3.5 w-3.5" />
                      Calendar
                    </button>
                    {isPremium && (
                      <button
                        type="button"
                        onClick={() => setViewMode("collages")}
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                          viewMode === "collages"
                            ? "bg-amber-500 text-white"
                            : "border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        }`}
                      >
                        <LayoutGrid className="h-3.5 w-3.5" />
                        Collages
                      </button>
                    )}
                  </div>
                </div>

                {historyActionMessage && (
                  <p className="rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-200 glass-card">
                    {historyActionMessage}
                  </p>
                )}

                {viewMode === "collages" && isPremium ? (
                  <div className="space-y-4">
                    {weeklyCollages.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300/90 p-8 text-center dark:border-slate-600/70 glass-card">
                        <LayoutGrid className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500" />
                        <p className="mt-4 text-slate-600 dark:text-slate-400">
                          Complete goals with photo proofs to build your weekly collages.
                        </p>
                      </div>
                    ) : (
                      weeklyCollages.map((collage) => (
                        <WeeklyCollageCard
                          key={collage.weekStart}
                          collage={collage}
                          gardenPlants={gardenSharePlants}
                        />
                      ))
                    )}
                  </div>
                ) : viewMode === "list" ? (
                  filteredGoals.map(({ goal, completedDates, subsByDate, streak }) => (
                    <section
                      key={goal.id}
                      className="rounded-2xl p-5 glass-card"
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
                                  ? `${streak} ${streak === 1 ? "week" : "weeks"} streak`
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
                                className="rounded-xl border border-slate-200/70 p-2 dark:border-slate-700/70 glass-card"
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
                  ))
                ) : (
                  <section className="rounded-2xl p-5 glass-card">
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setCalendarMonth((m) => startOfMonth(addMonths(m, -1)))}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        aria-label="Previous month"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <p className="text-lg font-semibold text-slate-900 dark:text-white">
                        {format(calendarGridDays.monthStart, "MMMM yyyy")}
                      </p>
                      <button
                        type="button"
                        onClick={() => setCalendarMonth((m) => startOfMonth(addMonths(m, 1)))}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        aria-label="Next month"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 sm:gap-2 sm:text-xs">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                        <span key={day}>{day}</span>
                      ))}
                    </div>
                    <div className="mt-2 grid grid-cols-7 grid-rows-[auto] gap-1.5 sm:gap-2">
                      {calendarGridDays.leadingDays.map((pad) => (
                        <div
                          key={`pad-${pad}`}
                          className="w-full rounded-xl bg-slate-100/50 dark:bg-slate-800/30"
                          style={{ aspectRatio: "1" }}
                        />
                      ))}
                      {calendarGridDays.monthDays.map((day) => {
                        const cellDate = new Date(
                          calendarGridDays.monthStart.getFullYear(),
                          calendarGridDays.monthStart.getMonth(),
                          day
                        );
                        const key = format(cellDate, "yyyy-MM-dd");
                        const proof = calendarProofByDate.get(key);
                        const isCurrentMonth = isSameMonth(cellDate, calendarGridDays.monthStart);
                        return (
                          <div
                            key={key}
                            className="relative w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50"
                            style={{ aspectRatio: "1" }}
                          >
                            {proof?.imageDataUrl ? (
                              <img
                                src={proof.imageDataUrl}
                                alt=""
                                className="block h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : null}
                            <span
                              className={`absolute bottom-1 right-1 rounded-md px-1.5 py-0.5 text-xs font-bold shadow-sm ${
                                proof?.imageDataUrl
                                  ? "bg-black/60 text-white"
                                  : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                              }`}
                            >
                              {isCurrentMonth ? day : ""}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
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
