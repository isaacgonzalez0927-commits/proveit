"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { useApp } from "@/context/AppContext";
import { getSubmissionWindowMessage, isGoalDue, isWithinSubmissionWindow } from "@/lib/goalDue";
import { hasCreatorAccess } from "@/lib/accountAccess";
import {
  applyGoalStreakOverride,
  DEFAULT_DEVELOPER_MODE_SETTINGS,
  getStoredDeveloperModeSettings,
  saveDeveloperModeSettings,
  type DeveloperModeSettings,
} from "@/lib/developerMode";
import { GOAL_PLANT_VARIANTS } from "@/lib/goalPlants";
import { getGoalStreak, isGoalDoneInCurrentWindow } from "@/lib/goalProgress";
import { Header } from "@/components/Header";
import { GardenSnapshot } from "@/components/GardenSnapshot";
import { PlantIllustration } from "@/components/PlantIllustration";
import { PLANT_GROWTH_STAGES, getPlantStageForStreak } from "@/lib/plantGrowth";

export default function BuddyPage() {
  const {
    user,
    goals,
    getSubmissionsForGoal,
    getGoalPlantVariant,
    setGoalPlantVariant,
  } = useApp();
  const [developerSettings, setDeveloperSettings] = useState<DeveloperModeSettings>(
    DEFAULT_DEVELOPER_MODE_SETTINGS
  );
  const [goalStreakDrafts, setGoalStreakDrafts] = useState<Record<string, string>>({});
  const [developerMessage, setDeveloperMessage] = useState<string | null>(null);
  const todayStr = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    setDeveloperSettings(getStoredDeveloperModeSettings());
  }, []);

  const isCreatorAccount = hasCreatorAccess(user?.email);
  const effectiveDeveloperSettings = isCreatorAccount
    ? developerSettings
    : DEFAULT_DEVELOPER_MODE_SETTINGS;

  useEffect(() => {
    if (!isCreatorAccount) return;
    const nextDrafts: Record<string, string> = {};
    for (const goal of goals) {
      const override = developerSettings.goalStreakOverrides[goal.id];
      nextDrafts[goal.id] = override == null ? "" : String(override);
    }
    setGoalStreakDrafts(nextDrafts);
  }, [goals, developerSettings.goalStreakOverrides, isCreatorAccount]);

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

  const parseNonNegativeInt = (value: string): number | null => {
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
    setDeveloperMessage(enabled ? "Developer mode enabled." : "Developer mode disabled.");
  };

  const handleGoalStreakDraftChange = (goalId: string, value: string) => {
    const cleaned = value.replace(/[^\d]/g, "");
    setGoalStreakDrafts((prev) => ({ ...prev, [goalId]: cleaned }));
  };

  const applyGoalStreakDraft = (goalId: string) => {
    const parsed = parseNonNegativeInt(goalStreakDrafts[goalId] ?? "");
    const nextOverrides = { ...developerSettings.goalStreakOverrides };
    if (parsed == null) {
      delete nextOverrides[goalId];
      setDeveloperMessage("Removed streak override for this goal.");
    } else {
      nextOverrides[goalId] = parsed;
      setDeveloperMessage(`Set this goal's streak override to ${parsed}.`);
    }
    const next: DeveloperModeSettings = {
      ...developerSettings,
      enabled: true,
      goalStreakOverrides: nextOverrides,
    };
    persistDeveloperSettings(next);
  };

  const clearGoalStreakDraft = (goalId: string) => {
    const nextOverrides = { ...developerSettings.goalStreakOverrides };
    delete nextOverrides[goalId];
    setGoalStreakDrafts((prev) => ({ ...prev, [goalId]: "" }));
    const next: DeveloperModeSettings = {
      ...developerSettings,
      goalStreakOverrides: nextOverrides,
    };
    persistDeveloperSettings(next);
    setDeveloperMessage("Cleared streak override for this goal.");
  };

  const clearAllGoalStreakOverrides = () => {
    const next: DeveloperModeSettings = {
      ...developerSettings,
      goalStreakOverrides: {},
    };
    persistDeveloperSettings(next);
    setDeveloperMessage("Cleared all goal streak overrides.");
  };

  const garden = goals.map((goal) => {
    const actualStreak = getGoalStreak(goal, getSubmissionsForGoal);
    const streak = applyGoalStreakOverride(goal.id, actualStreak, effectiveDeveloperSettings);
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
      actualStreak,
      streak,
      stage,
      due,
      doneInCurrentWindow,
      submissionWindowMessage,
      wateringLevel,
      plantVariant: getGoalPlantVariant(goal.id),
      hasStreakOverride:
        effectiveDeveloperSettings.enabled &&
        typeof effectiveDeveloperSettings.goalStreakOverrides[goal.id] === "number",
    };
  });

  const hydratedNow = garden.filter((g) => g.doneInCurrentWindow).length;
  const goalsDueNow = garden.filter((g) => g.due).length;
  const floweringPlants = garden.filter((g) => g.stage.stage === "flowering").length;
  const snapshotPlants = [...garden]
    .sort((a, b) => b.streak - a.streak)
    .map((entry) => ({
      id: entry.goal.id,
      stage: entry.stage.stage,
      wateringLevel: entry.wateringLevel,
      variant: entry.plantVariant,
    }));

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
          <div className="mt-3">
            <Link
              href="/goals"
              className="inline-flex rounded-lg bg-prove-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-prove-700"
            >
              Add goal
            </Link>
          </div>
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

        <section className="mb-6">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            Garden view
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            All your plants together in one view.
          </p>
          <GardenSnapshot plants={snapshotPlants} className="mt-2" />
        </section>

        {isCreatorAccount && (
          <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-800/60 dark:bg-amber-950/25">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Developer mode (garden controls)
                </p>
                <p className="text-xs text-amber-800/90 dark:text-amber-300/90">
                  Set streak overrides per goal directly in each card.
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
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={clearAllGoalStreakOverrides}
                className="rounded-md border border-amber-400 px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/40"
              >
                Clear all goal streak overrides
              </button>
            </div>
            {developerMessage && (
              <p className="mt-2 text-xs text-amber-900 dark:text-amber-200">{developerMessage}</p>
            )}
          </section>
        )}

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
                  {entry.hasStreakOverride && (
                    <span className="ml-1 text-amber-700 dark:text-amber-300">
                      (real {entry.actualStreak})
                    </span>
                  )}
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

                <div className="mt-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Plant style
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {GOAL_PLANT_VARIANTS.map((variant) => {
                      const selected = variant === entry.plantVariant;
                      return (
                        <button
                          key={variant}
                          type="button"
                          onClick={() => setGoalPlantVariant(entry.goal.id, variant)}
                          className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition ${
                            selected
                              ? "border-emerald-500 bg-emerald-100 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-900/40 dark:text-emerald-200"
                              : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          Plant {variant}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {isCreatorAccount && developerSettings.enabled && (
                  <div className="mt-3 rounded-lg border border-amber-300/70 bg-amber-50/90 p-2 dark:border-amber-700/60 dark:bg-amber-950/30">
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-amber-900 dark:text-amber-200">
                      Dev streak override
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={goalStreakDrafts[entry.goal.id] ?? ""}
                        onChange={(e) => handleGoalStreakDraftChange(entry.goal.id, e.target.value)}
                        placeholder="Use real"
                        className="w-20 rounded-md border border-amber-300 bg-white px-2 py-1 text-xs text-slate-900 placeholder:text-slate-500 dark:border-amber-700 dark:bg-amber-950/40 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => applyGoalStreakDraft(entry.goal.id)}
                        className="rounded-md bg-amber-700 px-2 py-1 text-[11px] font-semibold text-white hover:bg-amber-800"
                      >
                        Apply
                      </button>
                      <button
                        type="button"
                        onClick={() => clearGoalStreakDraft(entry.goal.id)}
                        className="rounded-md border border-amber-400 px-2 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/40"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
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
