"use client";

import Link from "next/link";
import { format, isThisWeek, startOfWeek, subWeeks } from "date-fns";
import { useApp } from "@/context/AppContext";
import { getSubmissionWindowMessage, isGoalDue, isWithinSubmissionWindow } from "@/lib/goalDue";
import { safeParseISO } from "@/lib/dateUtils";
import { Header } from "@/components/Header";
import { PlantIllustration } from "@/components/PlantIllustration";
import { PLANT_GROWTH_STAGES, getPlantStageForStreak } from "@/lib/plantGrowth";

function getGoalStreak(
  goal: { id: string; frequency: string },
  getSubmissionsForGoal: (id: string) => { date: string; status: string }[]
) {
  const subs = getSubmissionsForGoal(goal.id).filter((s) => s.status === "verified");
  if (goal.frequency === "weekly") {
    const weekStarts = new Set(
      subs
        .map((s) => safeParseISO(s.date))
        .filter((d): d is Date => !!d)
        .map((d) => format(startOfWeek(d, { weekStartsOn: 0 }), "yyyy-MM-dd"))
    );
    let streak = 0;
    let cursor = startOfWeek(new Date(), { weekStartsOn: 0 });
    while (weekStarts.has(format(cursor, "yyyy-MM-dd"))) {
      streak++;
      cursor = subWeeks(cursor, 1);
    }
    return streak;
  }

  const dates = new Set(subs.map((s) => s.date));
  let streak = 0;
  const cursor = new Date();
  while (dates.has(format(cursor, "yyyy-MM-dd"))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function isGoalDoneInCurrentWindow(
  goal: { id: string; frequency: string },
  getSubmissionsForGoal: (id: string) => { date: string; status: string }[],
  todayStr: string
) {
  const subs = getSubmissionsForGoal(goal.id).filter((s) => s.status === "verified");
  if (goal.frequency === "daily") {
    return subs.some((s) => s.date === todayStr);
  }
  return subs.some((s) => {
    const d = safeParseISO(s.date);
    return !!d && isThisWeek(d);
  });
}

export default function BuddyPage() {
  const { user, goals, getSubmissionsForGoal, getGoalPlantVariant } = useApp();
  const todayStr = format(new Date(), "yyyy-MM-dd");

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

  const garden = goals.map((goal) => {
    const streak = getGoalStreak(goal, getSubmissionsForGoal);
    const stage = getPlantStageForStreak(streak);
    const due = isGoalDue(goal);
    const doneInCurrentWindow = isGoalDoneInCurrentWindow(goal, getSubmissionsForGoal, todayStr);
    const withinSubmissionWindow = isWithinSubmissionWindow(goal);
    const submissionWindowMessage =
      due && !doneInCurrentWindow && !withinSubmissionWindow
        ? (getSubmissionWindowMessage(goal) ?? "Submission window closed")
        : null;
    const wateringLevel = doneInCurrentWindow ? 1 : due ? 0.18 : 0.62;
    return {
      goal,
      streak,
      stage,
      due,
      doneInCurrentWindow,
      submissionWindowMessage,
      wateringLevel,
      plantVariant: getGoalPlantVariant(goal.id),
    };
  });

  const hydratedNow = garden.filter((g) => g.doneInCurrentWindow).length;
  const goalsDueNow = garden.filter((g) => g.due).length;
  const floweringPlants = garden.filter((g) => g.stage.stage === "flowering").length;

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 pb-[max(6.5rem,env(safe-area-inset-bottom))]">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Your Garden
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Every goal grows its own plant. Finish goals to water each one and unlock all stage-6 flowers.
          </p>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Goals</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{goals.length}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-900/70 dark:bg-emerald-950/30">
            <p className="text-[11px] uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-300">Watered</p>
            <p className="mt-1 text-lg font-semibold text-emerald-800 dark:text-emerald-200">{hydratedNow}</p>
            <p className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80">
              {goalsDueNow > 0 ? `of ${goalsDueNow} due now` : "none due now"}
            </p>
          </div>
          <div className="rounded-xl border border-fuchsia-200 bg-fuchsia-50/70 p-3 dark:border-fuchsia-900/70 dark:bg-fuchsia-950/30">
            <p className="text-[11px] uppercase tracking-[0.15em] text-fuchsia-700 dark:text-fuchsia-300">Flowering</p>
            <p className="mt-1 text-lg font-semibold text-fuchsia-800 dark:text-fuchsia-200">{floweringPlants}</p>
            <p className="text-[10px] text-fuchsia-700/80 dark:text-fuchsia-300/80">Stage 6 plants</p>
          </div>
        </div>

        {goals.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
            <p className="text-slate-600 dark:text-slate-400">
              No plants yet. Create your first goal and pick Plant 1, 2, or 3 to start your garden.
            </p>
            <Link
              href="/goals"
              className="mt-3 inline-flex rounded-lg bg-prove-600 px-4 py-2 text-sm font-medium text-white hover:bg-prove-700"
            >
              Add your first goal
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {garden.map((entry) => (
              <article
                key={entry.goal.id}
                className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-cyan-50/40 p-4 dark:border-emerald-900/60 dark:from-emerald-950/25 dark:to-cyan-950/20"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900 dark:text-white">{entry.goal.title}</p>
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                      Plant {entry.plantVariant} · {entry.goal.frequency === "daily" ? "Daily" : "Weekly"}
                    </p>
                  </div>
                  <span className="rounded-full border border-emerald-200 bg-white/80 px-2 py-1 text-[11px] font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                    {entry.stage.name}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-center rounded-xl bg-white/70 py-3 dark:bg-slate-900/50">
                  <PlantIllustration
                    stage={entry.stage.stage}
                    wateringLevel={entry.wateringLevel}
                    wateredGoals={entry.doneInCurrentWindow ? 1 : 0}
                    variant={entry.plantVariant}
                  />
                </div>

                <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
                  Streak: <span className="font-medium text-slate-900 dark:text-slate-200">{entry.streak}</span>{" "}
                  {entry.goal.frequency === "daily" ? "days" : "weeks"}
                </p>
                <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                  {entry.doneInCurrentWindow
                    ? "Watered this cycle."
                    : entry.due
                      ? "Needs water now."
                      : "Next watering window is coming up."}
                </p>
                {entry.submissionWindowMessage && (
                  <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">{entry.submissionWindowMessage}</p>
                )}
                {entry.due && !entry.doneInCurrentWindow && !entry.submissionWindowMessage && (
                  <Link
                    href={`/goals/submit?goalId=${entry.goal.id}`}
                    className="mt-2 inline-flex rounded-md bg-prove-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-prove-700"
                  >
                    Water now
                  </Link>
                )}
              </article>
            ))}
          </div>
        )}

        <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
          <h2 className="font-semibold text-slate-900 dark:text-white">Growth stages</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
            {PLANT_GROWTH_STAGES.map((stage) => (
              <li key={stage.stage}>
                • {stage.minStreak} {stage.minStreak === 1 ? "day" : "days"}: {stage.name}
              </li>
            ))}
            <li>• Stage 6 supports three flower variants (Plant 1 / 2 / 3)</li>
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
