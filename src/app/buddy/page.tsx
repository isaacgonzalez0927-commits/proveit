"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Plus, Pencil, Save, Trash2, X, Pause, Play } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { getDueDayName, getReminderDays, getSubmissionWindowMessage, isGoalDue, isWithinSubmissionWindow } from "@/lib/goalDue";
import { hasCreatorAccess } from "@/lib/accountAccess";
import {
  applyGoalStreakOverride,
  DEFAULT_DEVELOPER_MODE_SETTINGS,
  getStoredDeveloperModeSettings,
  saveDeveloperModeSettings,
  type DeveloperModeSettings,
} from "@/lib/developerMode";
import {
  GOAL_PLANT_VARIANTS,
  type GoalPlantVariant,
} from "@/lib/goalPlants";
import { getGoalStreak, isGoalDoneInCurrentWindow } from "@/lib/goalProgress";
import { getBreakDurationDays, isProBreakExpired, PRO_GOAL_BREAK_MAX_DAYS } from "@/lib/goalBreak";
import { Header } from "@/components/Header";
import { GardenSnapshot } from "@/components/GardenSnapshot";
import { PlantIllustration } from "@/components/PlantIllustration";
import { PLANT_GROWTH_STAGES, getPlantStageForStreak } from "@/lib/plantGrowth";
import { getPlan } from "@/lib/store";
import { getStoredAppSettings } from "@/lib/appSettings";
import type { Goal, GoalFrequency, GracePeriod } from "@/types";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const GRACE_OPTIONS: { value: GracePeriod; label: string }[] = [
  { value: "1h", label: "1 hour after due" },
  { value: "3h", label: "3 hours after due" },
  { value: "6h", label: "6 hours after due" },
  { value: "12h", label: "12 hours after due" },
  { value: "eod", label: "Until end of day" },
];

export default function BuddyPage() {
  const {
    user,
    goals,
    addGoal,
    updateGoal,
    removeGoal,
    canAddGoal,
    getSubmissionsForGoal,
    getGoalPlantVariant,
    setGoalPlantVariant,
  } = useApp();
  const [developerSettings, setDeveloperSettings] = useState<DeveloperModeSettings>(
    DEFAULT_DEVELOPER_MODE_SETTINGS
  );
  const [goalStreakDrafts, setGoalStreakDrafts] = useState<Record<string, string>>({});
  const [developerMessage, setDeveloperMessage] = useState<string | null>(null);
  const [goalManagerMessage, setGoalManagerMessage] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newFrequency, setNewFrequency] = useState<GoalFrequency>(
    () => getStoredAppSettings().defaultGoalFrequency
  );
  const [newDailyTime, setNewDailyTime] = useState("09:00");
  const [newWeeklyTime, setNewWeeklyTime] = useState("10:00");
  const [newGracePeriod, setNewGracePeriod] = useState<GracePeriod>(
    () => getStoredAppSettings().defaultGoalGracePeriod
  );
  const [newWeeklyDays, setNewWeeklyDays] = useState<number[]>([]); // user selects which days
  const [newPlantVariant, setNewPlantVariant] = useState<GoalPlantVariant>(
    () => getStoredAppSettings().defaultGoalPlantVariant
  );
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editDraft, setEditDraft] = useState<{
    reminderTime: string;
    weeklyDays: number[];
    gracePeriod: GracePeriod;
  }>({
    reminderTime: "09:00",
    weeklyDays: [],
    gracePeriod: "eod",
  });
  const todayStr = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    setDeveloperSettings(getStoredDeveloperModeSettings());
  }, []);

  const isCreatorAccount = hasCreatorAccess(user?.email);
  const effectiveDeveloperSettings = isCreatorAccount
    ? developerSettings
    : DEFAULT_DEVELOPER_MODE_SETTINGS;
  const canEditExistingGoalStyle = user?.plan === "pro" || user?.plan === "premium";
  const canUseGoalBreak = user?.plan === "pro" || user?.plan === "premium";

  useEffect(() => {
    if (!isCreatorAccount) return;
    const nextDrafts: Record<string, string> = {};
    for (const goal of goals) {
      const override = developerSettings.goalStreakOverrides[goal.id];
      nextDrafts[goal.id] = override == null ? "" : String(override);
    }
    setGoalStreakDrafts(nextDrafts);
  }, [goals, developerSettings.goalStreakOverrides, isCreatorAccount]);

  // Pro: auto-resume goals that have been on break for 3+ days
  useEffect(() => {
    if (user?.plan !== "pro" || !goals.length) return;
    for (const goal of goals) {
      if (isProBreakExpired(goal, user.plan)) {
        const snapshot = goal.breakStreakSnapshot ?? 0;
        updateGoal(goal.id, { isOnBreak: false, streakCarryover: snapshot });
      }
    }
  }, [goals, user?.plan]);

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

  const plan = getPlan(user.plan);
  const canCreateDaily = canAddGoal("daily");
  const canCreateWeekly = canAddGoal("weekly");
  const resetCreateGoalForm = () => {
    const appSettings = getStoredAppSettings();
    setNewTitle("");
    setNewDescription("");
    setNewFrequency(appSettings.defaultGoalFrequency);
    setNewDailyTime("09:00");
    setNewWeeklyDays([1, 2, 3, 4, 5, 6]);
    setNewWeeklyTime("10:00");
    setNewGracePeriod(appSettings.defaultGoalGracePeriod);
    setNewPlantVariant(appSettings.defaultGoalPlantVariant);
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setGoalManagerMessage(null);
    if (!newTitle.trim()) {
      setGoalManagerMessage("Goal title is required.");
      return;
    }
    if (newFrequency === "daily" && !canCreateDaily) {
      setGoalManagerMessage("Daily goal limit reached for your current plan.");
      return;
    }
    if (newFrequency === "weekly" && !canCreateWeekly) {
      setGoalManagerMessage("Weekly goal limit reached for your current plan.");
      return;
    }
    const weeklyDays = newFrequency === "weekly" ? newWeeklyDays : undefined;
    if (weeklyDays && weeklyDays.length === 0) {
      setGoalManagerMessage("Select at least one day for your reminder.");
      return;
    }

    setIsAddingGoal(true);
    try {
      const result = await addGoal({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        frequency: newFrequency,
        reminderTime: newFrequency === "daily" ? newDailyTime : newWeeklyTime,
        reminderDay: weeklyDays && weeklyDays.length > 0 ? weeklyDays[0] : undefined,
        reminderDays: weeklyDays,
        gracePeriod: newGracePeriod,
      });
      if (!result.created) {
        const err = result.error?.trim() || "Something went wrong. Please try again.";
        setGoalManagerMessage(err.startsWith("Could not") ? err : `Could not create goal: ${err}`);
        return;
      }
      setGoalPlantVariant(result.created.id, newPlantVariant);
      setShowCreateForm(false);
      resetCreateGoalForm();
      setGoalManagerMessage("Goal added to your garden.");
    } finally {
      setIsAddingGoal(false);
    }
  };

  const startEditingGoal = (goal: Goal) => {
    setEditingGoalId(goal.id);
    const days = getReminderDays(goal);
    setEditDraft({
      reminderTime: goal.reminderTime ?? (goal.frequency === "daily" ? "09:00" : "10:00"),
      weeklyDays: goal.frequency === "weekly" ? days : [],
      gracePeriod: goal.gracePeriod ?? "eod",
    });
    setGoalManagerMessage(null);
  };

  const cancelEditingGoal = () => {
    setEditingGoalId(null);
    setIsSavingEdit(false);
  };

  const saveEditingGoal = async (goal: Goal) => {
    setGoalManagerMessage(null);
    const reminderDays = goal.frequency === "weekly" ? editDraft.weeklyDays : undefined;
    if (reminderDays && reminderDays.length === 0) {
      setGoalManagerMessage("Select at least one day.");
      return;
    }

    setIsSavingEdit(true);
    try {
      await updateGoal(goal.id, {
        reminderTime: editDraft.reminderTime,
        reminderDay: reminderDays && reminderDays.length > 0 ? reminderDays[0] : undefined,
        reminderDays: reminderDays ?? undefined,
        gracePeriod: editDraft.gracePeriod,
      });
      setEditingGoalId(null);
      setGoalManagerMessage("Schedule updated.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const deleteGoalFromGarden = async (goal: Goal) => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        `Delete "${goal.title}" and all of its proof history? This can't be undone.`
      );
      if (!confirmed) return;
    }
    await removeGoal(goal.id);
    if (editingGoalId === goal.id) {
      cancelEditingGoal();
    }
    setGoalManagerMessage("Goal deleted.");
  };

  const toggleGoalBreak = async (goal: Goal, displayedStreak: number) => {
    if (!canUseGoalBreak) {
      setGoalManagerMessage("Upgrade to Pro or Premium to use goal breaks.");
      return;
    }

    if (goal.isOnBreak) {
      await updateGoal(goal.id, {
        isOnBreak: false,
        streakCarryover: displayedStreak,
      });
      setGoalManagerMessage(`"${goal.title}" is active again. Streak continuity is preserved.`);
      return;
    }

    await updateGoal(goal.id, {
      isOnBreak: true,
      breakStartedAt: new Date().toISOString(),
      breakStreakSnapshot: displayedStreak,
      streakCarryover: displayedStreak,
    });
    const breakLimitMsg = user?.plan === "pro" ? " (up to 3 days)" : "";
    setGoalManagerMessage(`"${goal.title}" is now on break${breakLimitMsg}. Streak and growth are frozen.`);
  };

  const garden = goals.map((goal) => {
    const actualStreak = getGoalStreak(goal, getSubmissionsForGoal);
    const streak = applyGoalStreakOverride(goal.id, actualStreak, effectiveDeveloperSettings);
    const stage = getPlantStageForStreak(streak);
    const isOnBreak = goal.isOnBreak === true;
    const due = isGoalDue(goal);
    const doneInCurrentWindow = isOnBreak
      ? false
      : isGoalDoneInCurrentWindow(goal, getSubmissionsForGoal, todayStr);
    const canSubmitNow = isWithinSubmissionWindow(goal);
    const submissionWindowMessage =
      !doneInCurrentWindow && !canSubmitNow
        ? (getSubmissionWindowMessage(goal) ?? "Submission window closed")
        : null;
    const wateringLevel = isOnBreak ? 0.62 : doneInCurrentWindow ? 1 : due ? 0.18 : 0.62;
    const breakDays = getBreakDurationDays(goal);
    const isProPlan = user?.plan === "pro";
    return {
      goal,
      isOnBreak,
      breakDays,
      isProPlan,
      actualStreak,
      streak,
      stage,
      due,
      canSubmitNow,
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
            Goal Garden
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Every goal grows its own plant. Finish goals to water each one and unlock all stage-6 flowers.
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            One goal = one plant. You currently have {goals.length} plant{goals.length === 1 ? "" : "s"}.
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {plan.name} plan · {plan.dailyGoals === -1 ? "Unlimited" : plan.dailyGoals} daily ·{" "}
            {plan.weeklyGoals === -1 ? "Unlimited" : plan.weeklyGoals} weekly
          </p>
          {!canUseGoalBreak && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Upgrade to Pro or Premium to unlock Goal Break mode.
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowCreateForm((prev) => !prev);
                setGoalManagerMessage(null);
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-prove-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-prove-700"
            >
              <Plus className="h-3.5 w-3.5" />
              {showCreateForm ? "Close add goal" : "Add goal in garden"}
            </button>
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

        {goalManagerMessage && (
          <p className="mb-4 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            {goalManagerMessage}
          </p>
        )}

        {showCreateForm && (
          <form
            onSubmit={handleCreateGoal}
            className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Add goal in Garden
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              You can now create goals without leaving this page.
            </p>

            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Goal title"
              className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              required
            />
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Optional description"
              rows={2}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />

            <div className="mt-3 flex flex-wrap gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="radio"
                  checked={newFrequency === "daily"}
                  onChange={() => setNewFrequency("daily")}
                  disabled={!canCreateDaily}
                  className="text-prove-600"
                />
                Daily {!canCreateDaily && "(limit reached)"}
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="radio"
                  checked={newFrequency === "weekly"}
                  onChange={() => setNewFrequency("weekly")}
                  disabled={!canCreateWeekly}
                  className="text-prove-600"
                />
                Weekly {!canCreateWeekly && "(limit reached)"}
              </label>
            </div>

            {newFrequency === "weekly" && (
              <div className="mt-3">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Reminder on these days</p>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  Select at least one day. You can complete the goal on each selected day.
                </p>
                {newWeeklyDays.length === 0 && (
                  <p className="mt-1 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                    Pick one or more days above.
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  {DAY_NAMES.map((day, index) => (
                    <label
                      key={day}
                      className={`inline-flex cursor-pointer items-center rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                        newWeeklyDays.includes(index)
                          ? "border-prove-500 bg-prove-100 text-prove-800 dark:border-prove-500 dark:bg-prove-900/40 dark:text-prove-200"
                          : "border-slate-300 bg-white text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={newWeeklyDays.includes(index)}
                        onChange={(e) => {
                          if (e.target.checked) setNewWeeklyDays((d) => [...d, index].sort((a, b) => a - b));
                          else setNewWeeklyDays((d) => d.filter((x) => x !== index));
                        }}
                        className="sr-only"
                      />
                      {day.slice(0, 3)}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-slate-700 dark:text-slate-300">
                Reminder time
                <input
                  type="time"
                  value={newFrequency === "daily" ? newDailyTime : newWeeklyTime}
                  onChange={(e) =>
                    newFrequency === "daily"
                      ? setNewDailyTime(e.target.value)
                      : setNewWeeklyTime(e.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  required
                />
              </label>

              <label className="text-xs text-slate-700 dark:text-slate-300">
                Prove it within
                <select
                  value={newGracePeriod}
                  onChange={(e) => setNewGracePeriod(e.target.value as GracePeriod)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {GRACE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-3">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Plant style</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {GOAL_PLANT_VARIANTS.map((variant) => (
                  <button
                    key={variant}
                    type="button"
                    onClick={() => setNewPlantVariant(variant)}
                    className={`rounded-md border p-1 ${
                      newPlantVariant === variant
                        ? "border-emerald-500 bg-emerald-100 dark:border-emerald-500 dark:bg-emerald-900/40"
                        : "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800"
                    }`}
                    aria-label={`Select plant style ${variant}`}
                  >
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded bg-slate-50 dark:bg-slate-900">
                      <PlantIllustration
                        stage="flowering"
                        wateringLevel={1}
                        wateredGoals={1}
                        size="small"
                        variant={variant}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={isAddingGoal}
                className="rounded-lg bg-prove-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-prove-700 disabled:opacity-70"
              >
                {isAddingGoal ? "Adding..." : "Add goal"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  resetCreateGoalForm();
                }}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

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
                  Turn on/off from Settings only. Per-goal controls appear below when enabled.
                </p>
              </div>
              <Link
                href="/settings"
                className="inline-flex items-center rounded-md border border-amber-400 px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/40"
              >
                Open Settings
              </Link>
            </div>
            <p className="mt-2 text-xs text-amber-900 dark:text-amber-200">
              Current status: {developerSettings.enabled ? "ON" : "OFF"}.
            </p>
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
              No plants yet. Create your first goal and pick a plant style to start your garden.
            </p>
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="mt-3 inline-flex rounded-lg bg-prove-600 px-4 py-2 text-sm font-medium text-white hover:bg-prove-700"
            >
              Add your first goal
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-start justify-center gap-6 sm:gap-8">
            {garden.map((entry) => (
              <article key={entry.goal.id} className="flex min-w-[160px] max-w-[200px] flex-col items-center">
                <div className="flex w-full items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900 dark:text-white">{entry.goal.title}</p>
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                      {getDueDayName(entry.goal)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {entry.isOnBreak && (
                      <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                        {entry.isProPlan ? `Break (${Math.min(entry.breakDays, PRO_GOAL_BREAK_MAX_DAYS)}/${PRO_GOAL_BREAK_MAX_DAYS} days)` : "On break"}
                      </span>
                    )}
                    <span className="rounded-full border border-emerald-200 bg-white/80 px-2 py-1 text-[11px] font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                      {entry.stage.name}
                    </span>
                    {canUseGoalBreak && (
                      <button
                        type="button"
                        onClick={() => toggleGoalBreak(entry.goal, entry.streak)}
                        className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white/80 px-2 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:bg-slate-900/60 dark:text-amber-300 dark:hover:bg-amber-900/30"
                        aria-label={entry.isOnBreak ? "Resume goal from break" : "Put goal on break"}
                      >
                        {entry.isOnBreak ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                        {entry.isOnBreak ? "Resume" : "Break"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        editingGoalId === entry.goal.id
                          ? cancelEditingGoal()
                          : startEditingGoal(entry.goal)
                      }
                      className="rounded-md border border-slate-300 bg-white/80 p-1 text-slate-600 hover:bg-white hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                      aria-label={editingGoalId === entry.goal.id ? "Close edit" : "Edit goal"}
                    >
                      {editingGoalId === entry.goal.id ? (
                        <X className="h-3.5 w-3.5" />
                      ) : (
                        <Pencil className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteGoalFromGarden(entry.goal)}
                      className="rounded-md border border-red-300 bg-white/80 p-1 text-red-600 hover:bg-red-50 dark:border-red-700 dark:bg-slate-900/60 dark:text-red-300 dark:hover:bg-red-900/30"
                      aria-label="Delete goal"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-center py-2">
                  <PlantIllustration
                    stage={entry.stage.stage}
                    wateringLevel={entry.wateringLevel}
                    wateredGoals={entry.doneInCurrentWindow ? 1 : 0}
                    variant={entry.plantVariant}
                  />
                </div>

                <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
                  Streak: <span className="font-medium text-slate-900 dark:text-slate-200">{entry.streak}</span>{" "}
                  {getReminderDays(entry.goal).length === 7 ? "days" : "times"}
                  {entry.hasStreakOverride && (
                    <span className="ml-1 text-amber-700 dark:text-amber-300">
                      (real {entry.actualStreak})
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                  {entry.isOnBreak
                    ? "On break. Streak and growth are paused."
                    : entry.doneInCurrentWindow
                    ? "Watered this cycle."
                    : entry.canSubmitNow
                      ? "Needs water now."
                      : "Waiting for the next cycle."}
                </p>
                {entry.submissionWindowMessage && (
                  <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">{entry.submissionWindowMessage}</p>
                )}
                {entry.canSubmitNow && !entry.doneInCurrentWindow && !entry.submissionWindowMessage && (
                  <Link
                    href={`/goals/submit?goalId=${entry.goal.id}`}
                    className="mt-2 inline-flex rounded-md bg-prove-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-prove-700"
                  >
                    Water now
                  </Link>
                )}

                {canEditExistingGoalStyle ? (
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
                            className={`rounded-md border p-1 transition ${
                              selected
                                ? "border-emerald-500 bg-emerald-100 dark:border-emerald-500 dark:bg-emerald-900/40"
                                : "border-slate-300 bg-white hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800"
                            }`}
                            aria-label={`Set plant style ${variant}`}
                          >
                            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded bg-slate-50 dark:bg-slate-900">
                              <PlantIllustration
                                stage="flowering"
                                wateringLevel={1}
                                wateredGoals={1}
                                size="small"
                                variant={variant}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                      Plant style
                    </p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      Upgrade to Pro or Premium to change plant style after goal creation.
                    </p>
                  </div>
                )}

                {editingGoalId === entry.goal.id && (
                  <div className="mt-3 rounded-lg border border-slate-300 bg-white/85 p-3 dark:border-slate-700 dark:bg-slate-900/70">
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">
                      Edit schedule (time &amp; days only)
                    </p>

                    <label className="mt-2 block text-[11px] text-slate-700 dark:text-slate-300">
                      Reminder time
                      <input
                        type="time"
                        value={editDraft.reminderTime}
                        onChange={(e) =>
                          setEditDraft((prev) => ({ ...prev, reminderTime: e.target.value }))
                        }
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </label>

                    {entry.goal.frequency === "weekly" && (
                      <div className="mt-2">
                        <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300">Days</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {DAY_NAMES.map((day, index) => (
                            <label
                              key={day}
                              className={`inline-flex cursor-pointer items-center rounded-md border px-2 py-1 text-[11px] font-medium ${
                                editDraft.weeklyDays.includes(index)
                                  ? "border-prove-500 bg-prove-100 text-prove-800 dark:border-prove-500 dark:bg-prove-900/40 dark:text-prove-200"
                                  : "border-slate-300 bg-white text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={editDraft.weeklyDays.includes(index)}
                                onChange={(e) => {
                                  if (e.target.checked)
                                    setEditDraft((prev) => ({
                                      ...prev,
                                      weeklyDays: [...prev.weeklyDays, index].sort((a, b) => a - b),
                                    }));
                                  else
                                    setEditDraft((prev) => ({
                                      ...prev,
                                      weeklyDays: prev.weeklyDays.filter((x) => x !== index),
                                    }));
                                }}
                                className="sr-only"
                              />
                              {day.slice(0, 3)}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <label className="mt-2 block text-[11px] text-slate-700 dark:text-slate-300">
                      Prove it within
                      <select
                        value={editDraft.gracePeriod}
                        onChange={(e) =>
                          setEditDraft((prev) => ({
                            ...prev,
                            gracePeriod: e.target.value as GracePeriod,
                          }))
                        }
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        {GRACE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => saveEditingGoal(entry.goal)}
                        disabled={isSavingEdit}
                        className="inline-flex items-center gap-1 rounded-md bg-prove-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-prove-700 disabled:opacity-70"
                      >
                        <Save className="h-3.5 w-3.5" />
                        {isSavingEdit ? "Saving..." : "Save changes"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditingGoal}
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

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
            <li>• Stage 6 supports four flower style variants</li>
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
