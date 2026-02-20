"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SlidersHorizontal, Trash2 } from "lucide-react";
import { Header } from "@/components/Header";
import { useApp } from "@/context/AppContext";
import {
  DEFAULT_HISTORY_DISPLAY_SETTINGS,
  getStoredHistoryDisplaySettings,
  saveHistoryDisplaySettings,
  type HistoryDisplaySettings,
} from "@/lib/historySettings";

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

export default function SettingsPage() {
  const { user, goals, submissions, deleteGoalHistory } = useApp();
  const [historySettings, setHistorySettings] = useState<HistoryDisplaySettings>(
    DEFAULT_HISTORY_DISPLAY_SETTINGS
  );
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);

  useEffect(() => {
    setHistorySettings(getStoredHistoryDisplaySettings());
  }, []);

  const goalsWithHistory = useMemo(
    () =>
      goals
        .map((goal) => {
          const totalEntries = submissions.filter((submission) => submission.goalId === goal.id).length;
          const verifiedEntries = submissions.filter(
            (submission) => submission.goalId === goal.id && submission.status === "verified"
          ).length;
          return { goal, totalEntries, verifiedEntries };
        })
        .filter((entry) => entry.totalEntries > 0),
    [goals, submissions]
  );

  const updateHistorySetting = (key: keyof HistoryDisplaySettings, checked: boolean) => {
    const next = { ...historySettings, [key]: checked };
    setHistorySettings(next);
    saveHistoryDisplaySettings(next);
    setSettingsMessage("History settings saved.");
  };

  const handleDeleteGoalHistory = async (goalId: string, goalTitle: string) => {
    setSettingsMessage(null);
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        `Delete all history for "${goalTitle}"? This removes submissions and verified dates for this goal.`
      );
      if (!confirmed) return;
    }
    setDeletingGoalId(goalId);
    try {
      await deleteGoalHistory(goalId);
      setSettingsMessage(`Deleted history for "${goalTitle}".`);
    } catch {
      setSettingsMessage("Could not delete goal history right now.");
    } finally {
      setDeletingGoalId(null);
    }
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
            Choose what appears in Goal History and manage saved history by goal.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
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

        <section className="mt-6 rounded-2xl border border-red-200 bg-red-50/50 p-5 dark:border-red-900/60 dark:bg-red-950/20">
          <h2 className="font-semibold text-red-800 dark:text-red-200">Delete goal history</h2>
          <p className="mt-1 text-xs text-red-700/90 dark:text-red-300/90">
            Remove all saved submissions and verified dates for a specific goal.
          </p>
          {goalsWithHistory.length === 0 ? (
            <p className="mt-3 text-sm text-red-700/90 dark:text-red-300/90">
              No goal history found yet.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {goalsWithHistory.map((entry) => (
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
                    onClick={() => handleDeleteGoalHistory(entry.goal.id, entry.goal.title)}
                    disabled={deletingGoalId === entry.goal.id}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-red-300 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-70 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {deletingGoalId === entry.goal.id ? "Deleting..." : "Delete history"}
                  </button>
                </div>
              ))}
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
