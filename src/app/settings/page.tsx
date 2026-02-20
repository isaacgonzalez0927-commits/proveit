"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SlidersHorizontal, Trash2 } from "lucide-react";
import { Header } from "@/components/Header";
import { useApp } from "@/context/AppContext";
import { PlantIllustration } from "@/components/PlantIllustration";
import { hasCreatorAccess } from "@/lib/accountAccess";
import {
  getStoredDeveloperModeSettings,
  saveDeveloperModeSettings,
} from "@/lib/developerMode";
import {
  DEFAULT_HISTORY_DISPLAY_SETTINGS,
  getStoredHistoryDisplaySettings,
  saveHistoryDisplaySettings,
  type HistoryDisplaySettings,
} from "@/lib/historySettings";
import {
  DEFAULT_APP_SETTINGS,
  getStoredAppSettings,
  saveAppSettings,
  type AppSettings,
} from "@/lib/appSettings";
import {
  getStoredHiddenHistoryGoalIds,
  hideGoalFromHistory,
  saveHiddenHistoryGoalIds,
  showGoalInHistory,
} from "@/lib/historyVisibility";
import { GOAL_PLANT_VARIANTS, type GoalPlantVariant } from "@/lib/goalPlants";
import type { GoalFrequency, GracePeriod } from "@/types";

const HISTORY_SETTING_ITEMS: Array<{
  key: keyof HistoryDisplaySettings;
  label: string;
  description: string;
}> = [
  {
    key: "showProofPhotos",
    label: "Show proof photos",
    description: "Display image thumbnails in goal history when a submission has a photo.",
  },
  {
    key: "showStreak",
    label: "Show streak details",
    description: "Show current streak for each goal inside history cards.",
  },
  {
    key: "showVerifiedCount",
    label: "Show verified count",
    description: "Show total verified entries for each goal.",
  },
  {
    key: "showThisWeekBadge",
    label: "Show \"This week\" badge",
    description: "Highlight entries that happened in the current week.",
  },
];

const GOAL_FREQUENCY_OPTIONS: Array<{ value: GoalFrequency; label: string }> = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

const GRACE_PERIOD_OPTIONS: Array<{ value: GracePeriod; label: string }> = [
  { value: "1h", label: "1 hour after due" },
  { value: "3h", label: "3 hours after due" },
  { value: "6h", label: "6 hours after due" },
  { value: "12h", label: "12 hours after due" },
  { value: "eod", label: "Until end of day" },
];

export default function SettingsPage() {
  const { user, goals, submissions } = useApp();
  const [historySettings, setHistorySettings] = useState<HistoryDisplaySettings>(
    DEFAULT_HISTORY_DISPLAY_SETTINGS
  );
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [hidingGoalId, setHidingGoalId] = useState<string | null>(null);
  const [hiddenGoalIds, setHiddenGoalIds] = useState<string[]>([]);
  const [developerEnabled, setDeveloperEnabled] = useState(false);
  const isCreatorAccount = hasCreatorAccess(user?.email);

  useEffect(() => {
    setHistorySettings(getStoredHistoryDisplaySettings());
    setAppSettings(getStoredAppSettings());
    setHiddenGoalIds(getStoredHiddenHistoryGoalIds());
    setDeveloperEnabled(getStoredDeveloperModeSettings().enabled);
  }, []);

  const goalHistoryEntries = useMemo(
    () =>
      goals
        .map((goal) => {
          const totalEntries = submissions.filter((submission) => submission.goalId === goal.id).length;
          const verifiedEntries = submissions.filter(
            (submission) => submission.goalId === goal.id && submission.status === "verified"
          ).length;
          return {
            goal,
            totalEntries,
            verifiedEntries,
            hidden: hiddenGoalIds.includes(goal.id),
          };
        })
        .filter((entry) => entry.totalEntries > 0),
    [goals, submissions, hiddenGoalIds]
  );
  const visibleGoalHistoryEntries = goalHistoryEntries.filter((entry) => !entry.hidden);
  const hiddenGoalHistoryEntries = goalHistoryEntries.filter((entry) => entry.hidden);

  const updateHistorySetting = (key: keyof HistoryDisplaySettings, checked: boolean) => {
    const next = { ...historySettings, [key]: checked };
    setHistorySettings(next);
    saveHistoryDisplaySettings(next);
    setSettingsMessage("History settings saved.");
  };

  const updateAppSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const next: AppSettings = { ...appSettings, [key]: value };
    setAppSettings(next);
    saveAppSettings(next);
    setSettingsMessage("Goal creation defaults saved.");
  };

  const updateDefaultPlantStyle = (variant: GoalPlantVariant) => {
    updateAppSetting("defaultGoalPlantVariant", variant);
  };

  const handleToggleDeveloperTools = (enabled: boolean) => {
    const next = { ...getStoredDeveloperModeSettings(), enabled };
    saveDeveloperModeSettings(next);
    setDeveloperEnabled(enabled);
    setSettingsMessage(enabled ? "Developer tools enabled." : "Developer tools disabled.");
  };

  const handleHideGoalHistory = async (goalId: string, goalTitle: string) => {
    setSettingsMessage(null);
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        `Hide "${goalTitle}" from Goal History? You can restore it below any time.`
      );
      if (!confirmed) return;
    }
    setHidingGoalId(goalId);
    const nextHiddenGoalIds = hideGoalFromHistory(goalId, hiddenGoalIds);
    setHiddenGoalIds(nextHiddenGoalIds);
    saveHiddenHistoryGoalIds(nextHiddenGoalIds);
    setSettingsMessage(`Hidden "${goalTitle}" from history.`);
    setHidingGoalId(null);
  };

  const handleShowGoalHistory = (goalId: string, goalTitle: string) => {
    const nextHiddenGoalIds = showGoalInHistory(goalId, hiddenGoalIds);
    setHiddenGoalIds(nextHiddenGoalIds);
    saveHiddenHistoryGoalIds(nextHiddenGoalIds);
    setSettingsMessage(`Restored "${goalTitle}" in history.`);
  };

  if (!user) {
    return (
      <>
        <Header />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 pb-[max(6.5rem,env(safe-area-inset-bottom))] text-center">
          <p className="text-slate-600 dark:text-slate-400">Please sign in from the dashboard.</p>
          <Link href="/dashboard" className="mt-4 inline-block text-prove-600 hover:underline">
            Go to Dashboard
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 pb-[max(6.5rem,env(safe-area-inset-bottom))]">
        <div className="mb-8">
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-slate-900 dark:text-white">
            <SlidersHorizontal className="h-6 w-6 text-prove-600 dark:text-prove-400" />
            Settings
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Configure goal creation defaults, choose what appears in history, and manage saved history.
          </p>
        </div>

        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/45 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/20">
          <h2 className="font-semibold text-emerald-900 dark:text-emerald-200">Goal creation defaults</h2>
          <p className="mt-1 text-xs text-emerald-800/90 dark:text-emerald-300/90">
            These apply when you create a new goal in Garden or Goals.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-emerald-900 dark:text-emerald-200">
              Default frequency
              <select
                value={appSettings.defaultGoalFrequency}
                onChange={(event) =>
                  updateAppSetting("defaultGoalFrequency", event.target.value as GoalFrequency)
                }
                className="mt-1 w-full rounded-md border border-emerald-300 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-emerald-700 dark:bg-emerald-950/35 dark:text-white"
              >
                {GOAL_FREQUENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs text-emerald-900 dark:text-emerald-200">
              Default grace period
              <select
                value={appSettings.defaultGoalGracePeriod}
                onChange={(event) =>
                  updateAppSetting("defaultGoalGracePeriod", event.target.value as GracePeriod)
                }
                className="mt-1 w-full rounded-md border border-emerald-300 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-emerald-700 dark:bg-emerald-950/35 dark:text-white"
              >
                {GRACE_PERIOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4">
            <p className="text-xs text-emerald-900 dark:text-emerald-200">Default plant style</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {GOAL_PLANT_VARIANTS.map((variant) => (
                <button
                  key={variant}
                  type="button"
                  onClick={() => updateDefaultPlantStyle(variant)}
                  className={`rounded-md border p-1 ${
                    appSettings.defaultGoalPlantVariant === variant
                      ? "border-emerald-500 bg-emerald-100 dark:border-emerald-500 dark:bg-emerald-900/40"
                      : "border-emerald-200 bg-white dark:border-emerald-700 dark:bg-emerald-950/35"
                  }`}
                  aria-label={`Set default plant style ${variant}`}
                >
                  <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded bg-slate-50 dark:bg-slate-900">
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
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-semibold text-slate-900 dark:text-white">History display</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            These options control what is shown on the Goal History page.
          </p>
          <div className="mt-4 space-y-3">
            {HISTORY_SETTING_ITEMS.map((item) => (
              <label
                key={item.key}
                className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/50"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{item.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.description}</p>
                </div>
                <input
                  type="checkbox"
                  checked={historySettings[item.key]}
                  onChange={(event) => updateHistorySetting(item.key, event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-prove-600 focus:ring-prove-500 dark:border-slate-600"
                />
              </label>
            ))}
          </div>
        </section>

        {isCreatorAccount && (
          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/55 p-5 dark:border-amber-900/60 dark:bg-amber-950/25">
            <h2 className="font-semibold text-amber-900 dark:text-amber-200">Developer tools (private)</h2>
            <p className="mt-1 text-xs text-amber-800/90 dark:text-amber-300/90">
              Only visible for isaacgonzalez0927@gmail.com. Toggle developer tools here.
            </p>
            <label className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/35 dark:text-amber-200">
              <input
                type="checkbox"
                checked={developerEnabled}
                onChange={(event) => handleToggleDeveloperTools(event.target.checked)}
                className="h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
              />
              {developerEnabled ? "Developer tools ON" : "Developer tools OFF"}
            </label>
          </section>
        )}

        <section className="mt-6 rounded-2xl border border-red-200 bg-red-50/50 p-5 dark:border-red-900/60 dark:bg-red-950/20">
          <h2 className="font-semibold text-red-800 dark:text-red-200">Hide goals from history</h2>
          <p className="mt-1 text-xs text-red-700/90 dark:text-red-300/90">
            Hiding removes the goal from History view only. It does not delete proof data.
          </p>
          {visibleGoalHistoryEntries.length === 0 ? (
            <p className="mt-3 text-sm text-red-700/90 dark:text-red-300/90">
              No visible goal history right now.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {visibleGoalHistoryEntries.map((entry) => (
                <div
                  key={entry.goal.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-white px-3 py-2.5 dark:border-red-900/60 dark:bg-slate-900/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                      {entry.goal.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {entry.totalEntries} entries · {entry.verifiedEntries} verified
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleHideGoalHistory(entry.goal.id, entry.goal.title)}
                    disabled={hidingGoalId === entry.goal.id}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-red-300 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-70 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {hidingGoalId === entry.goal.id ? "Hiding..." : "Hide from history"}
                  </button>
                </div>
              ))}
            </div>
          )}
          {hiddenGoalHistoryEntries.length > 0 && (
            <div className="mt-4 rounded-lg border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/70">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">
                Hidden goals
              </p>
              <div className="mt-2 space-y-2">
                {hiddenGoalHistoryEntries.map((entry) => (
                  <div key={entry.goal.id} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-sm text-slate-700 dark:text-slate-300">
                      {entry.goal.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleShowGoalHistory(entry.goal.id, entry.goal.title)}
                      className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Show again
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {settingsMessage && (
          <p className="mt-4 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            {settingsMessage}
          </p>
        )}

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
