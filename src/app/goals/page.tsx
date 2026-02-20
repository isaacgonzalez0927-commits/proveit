"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2, CheckCircle2, Calendar, Sun, Camera } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Header } from "@/components/Header";
import { PlantIllustration } from "@/components/PlantIllustration";
import { getPlan } from "@/lib/store";
import { getStoredAppSettings } from "@/lib/appSettings";
import { safeParseISO } from "@/lib/dateUtils";
import { isGoalDue, getNextDueLabel, isWithinSubmissionWindow, getSubmissionWindowMessage } from "@/lib/goalDue";
import { format, isThisWeek } from "date-fns";
import type { GoalFrequency, GracePeriod } from "@/types";
import {
  GOAL_PLANT_VARIANTS,
  type GoalPlantVariant,
} from "@/lib/goalPlants";

function GoalsContent() {
  const {
    user,
    goals,
    addGoal,
    removeGoal,
    canAddGoal,
    getSubmissionsForGoal,
    setGoalPlantVariant,
    getGoalPlantVariant,
  } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [addGoalError, setAddGoalError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState<GoalFrequency>(
    () => getStoredAppSettings().defaultGoalFrequency
  );
  const [dailyTime, setDailyTime] = useState("09:00");
  const [weeklyDay, setWeeklyDay] = useState<number>(0);
  const [weeklyTime, setWeeklyTime] = useState("10:00");
  const [gracePeriod, setGracePeriod] = useState<GracePeriod>(
    () => getStoredAppSettings().defaultGoalGracePeriod
  );
  const [selectedPlantVariant, setSelectedPlantVariant] = useState<GoalPlantVariant>(
    () => getStoredAppSettings().defaultGoalPlantVariant
  );
  const [goalToDelete, setGoalToDelete] = useState<{ id: string; title: string } | null>(null);

  const GRACE_OPTIONS: { value: GracePeriod; label: string }[] = [
    { value: "1h", label: "1 hour after due" },
    { value: "3h", label: "3 hours after due" },
    { value: "6h", label: "6 hours after due" },
    { value: "12h", label: "12 hours after due" },
    { value: "eod", label: "Until end of day" },
  ];

  if (!user) {
    return (
      <>
        <Header />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 pb-[max(6.5rem,env(safe-area-inset-bottom))] text-center">
          <p className="text-slate-600 dark:text-slate-400">
            Please sign in from the dashboard to manage goals.
          </p>
          <Link href="/dashboard" className="mt-4 inline-block text-prove-600 hover:underline">
            Go to Dashboard
          </Link>
        </main>
      </>
    );
  }

  const plan = getPlan(user.plan);
  const dailyCount = goals.filter((g) => g.frequency === "daily").length;
  const weeklyCount = goals.filter((g) => g.frequency === "weekly").length;
  const canAddDaily = canAddGoal("daily");
  const canAddWeekly = canAddGoal("weekly");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddGoalError(null);
    if (!title.trim()) {
      setAddGoalError("Goal title is required.");
      return;
    }
    const limit = frequency === "daily" ? canAddDaily : canAddWeekly;
    if (!limit) {
      setAddGoalError("Goal limit reached for this frequency on your current plan.");
      return;
    }
    const reminderTime = frequency === "daily" ? dailyTime : weeklyTime;
    const reminderDay = frequency === "weekly" ? weeklyDay : undefined;
    setIsAddingGoal(true);
    try {
      const created = await addGoal({
        title: title.trim(),
        description: description.trim() || undefined,
        frequency,
        reminderTime,
        reminderDay,
        gracePeriod,
      });
      if (!created) {
        setAddGoalError("Could not create goal right now. Please try again in a moment.");
        return;
      }
      setGoalPlantVariant(created.id, selectedPlantVariant);
      const appSettings = getStoredAppSettings();
      setTitle("");
      setDescription("");
      setFrequency(appSettings.defaultGoalFrequency);
      setDailyTime("09:00");
      setWeeklyDay(0);
      setWeeklyTime("10:00");
      setGracePeriod(appSettings.defaultGoalGracePeriod);
      setSelectedPlantVariant(appSettings.defaultGoalPlantVariant);
      setShowForm(false);
    } finally {
      setIsAddingGoal(false);
    }
  };

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 pb-[max(6.5rem,env(safe-area-inset-bottom))]">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              Your goals
            </h1>
            <p className="mt-1 text-slate-600 dark:text-slate-400">
              {plan.name} plan · {plan.dailyGoals === -1 ? "Unlimited" : plan.dailyGoals} daily,{" "}
              {plan.weeklyGoals === -1 ? "Unlimited" : plan.weeklyGoals} weekly
            </p>
          </div>
          <button
            onClick={() => {
              setAddGoalError(null);
              setShowForm((v) => !v);
            }}
            className="flex items-center gap-2 rounded-lg bg-prove-600 px-4 py-2 text-sm font-medium text-white hover:bg-prove-700 disabled:opacity-50"
            disabled={!canAddDaily && !canAddWeekly}
          >
            <Plus className="h-4 w-4" />
            Add goal
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleAdd}
            className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
          >
            <h2 className="font-display font-semibold text-slate-900 dark:text-white">
              New goal
            </h2>
            <input
              type="text"
              placeholder="e.g. Run 3 miles"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (addGoalError) setAddGoalError(null);
              }}
              className="mt-4 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-500 focus:border-prove-500 focus:outline-none focus:ring-2 focus:ring-prove-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              required
            />
            <textarea
              placeholder="Optional description (helps AI verify)"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (addGoalError) setAddGoalError(null);
              }}
              rows={2}
              className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-500 focus:border-prove-500 focus:outline-none focus:ring-2 focus:ring-prove-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <div className="mt-4 flex gap-4">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="frequency"
                  checked={frequency === "daily"}
                  onChange={() => setFrequency("daily")}
                  disabled={!canAddDaily}
                  className="text-prove-600"
                />
                <Sun className="h-4 w-4" />
                Daily
                {!canAddDaily && (
                  <span className="text-xs text-slate-500">(limit reached)</span>
                )}
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="frequency"
                  checked={frequency === "weekly"}
                  onChange={() => setFrequency("weekly")}
                  disabled={!canAddWeekly}
                  className="text-prove-600"
                />
                <Calendar className="h-4 w-4" />
                Weekly
                {!canAddWeekly && (
                  <span className="text-xs text-slate-500">(limit reached)</span>
                )}
              </label>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {frequency === "weekly" && (
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Day of week
                  </label>
                  <select
                    value={weeklyDay}
                    onChange={(e) => setWeeklyDay(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-prove-500 focus:outline-none focus:ring-2 focus:ring-prove-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value={0}>Sunday</option>
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                    <option value={6}>Saturday</option>
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Reminder time
                </label>
                <input
                  type="time"
                  value={frequency === "daily" ? dailyTime : weeklyTime}
                  onChange={(e) =>
                    frequency === "daily"
                      ? setDailyTime(e.target.value)
                      : setWeeklyTime(e.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-prove-500 focus:outline-none focus:ring-2 focus:ring-prove-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Submit proof within
                </label>
                <select
                  value={gracePeriod}
                  onChange={(e) => setGracePeriod(e.target.value as GracePeriod)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-prove-500 focus:outline-none focus:ring-2 focus:ring-prove-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {GRACE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Choose plant style
              </label>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {GOAL_PLANT_VARIANTS.map((variant) => {
                  const isSelected = selectedPlantVariant === variant;
                  return (
                    <button
                      key={variant}
                      type="button"
                      onClick={() => setSelectedPlantVariant(variant)}
                      className={`rounded-xl border p-1.5 transition ${
                        isSelected
                          ? "border-prove-500 bg-prove-50 dark:border-prove-500 dark:bg-prove-950/40"
                          : "border-slate-300 bg-white hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800"
                      }`}
                      aria-label={`Select plant style ${variant}`}
                    >
                      <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg bg-slate-50 dark:bg-slate-900">
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
            {addGoalError && (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">{addGoalError}</p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                disabled={isAddingGoal}
                className="rounded-lg bg-prove-600 px-4 py-2 text-sm font-medium text-white hover:bg-prove-700 disabled:opacity-60"
              >
                {isAddingGoal ? "Adding..." : "Add goal"}
              </button>
              <button
                type="button"
                onClick={() => {
                  const appSettings = getStoredAppSettings();
                  setShowForm(false);
                  setAddGoalError(null);
                  setFrequency(appSettings.defaultGoalFrequency);
                  setGracePeriod(appSettings.defaultGoalGracePeriod);
                  setSelectedPlantVariant(appSettings.defaultGoalPlantVariant);
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <ul className="space-y-3">
          {goals.map((goal) => {
            const timeLabel = goal.reminderTime ?? "";
            const dayLabel =
              goal.frequency === "weekly" && typeof goal.reminderDay === "number"
                ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][goal.reminderDay]
                : null;
            const plantVariant = getGoalPlantVariant(goal.id);
            const due = isGoalDue(goal);
            const dueLabel = getNextDueLabel(goal);
            const todayStr = format(new Date(), "yyyy-MM-dd");
            const isDone = goal.frequency === "daily"
              ? getSubmissionsForGoal(goal.id).some((s) => s.date === todayStr && s.status === "verified")
              : getSubmissionsForGoal(goal.id).some((s) => {
                  const d = safeParseISO(s.date);
                  return !!d && isThisWeek(d) && s.status === "verified";
                });

            return (
              <li
                key={goal.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center gap-3">
                  {goal.frequency === "daily" ? (
                    <Sun className="h-5 w-5 text-amber-500" />
                  ) : (
                    <Calendar className="h-5 w-5 text-prove-500" />
                  )}
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {goal.title}
                    </p>
                    {goal.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {goal.description}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {goal.frequency === "daily" ? "Daily" : "Weekly"}
                      {timeLabel && (
                        <> · {dayLabel ? `${dayLabel} ` : ""}{timeLabel}</>
                      )}
                      {!due && dueLabel && ` · ${dueLabel}`}
                    </p>
                    <div className="mt-1 inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-md bg-emerald-50 dark:bg-emerald-900/30">
                      <PlantIllustration
                        stage="flowering"
                        wateringLevel={1}
                        wateredGoals={1}
                        size="small"
                        variant={plantVariant}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {due ? (
                    isDone ? (
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
                      <span className="text-xs text-slate-500 dark:text-slate-400 max-w-[160px]">
                        {getSubmissionWindowMessage(goal) ?? "Not due yet"}
                      </span>
                    )
                  ) : (
                    <span className="text-sm text-slate-400 dark:text-slate-500">
                      {dueLabel}
                    </span>
                  )}
                  <button
                    onClick={() => setGoalToDelete({ id: goal.id, title: goal.title })}
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                    aria-label="Delete goal"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        {goals.length === 0 && !showForm && (
          <p className="mt-8 text-center text-slate-500 dark:text-slate-400">
            No goals yet. Click &quot;Add goal&quot; to create your first one.
          </p>
        )}

        <Link
          href="/dashboard"
          className="mt-8 block text-center text-sm text-prove-600 hover:underline"
        >
          ← Back to dashboard
        </Link>
      </main>

      {goalToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 dark:bg-black/70"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-goal-title"
        >
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h2 id="delete-goal-title" className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Delete goal?
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              &quot;{goalToDelete.title}&quot; and all its proof history will be removed. This can&apos;t be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setGoalToDelete(null)}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  removeGoal(goalToDelete.id);
                  setGoalToDelete(null);
                }}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function GoalsPage() {
  return <GoalsContent />;
}
