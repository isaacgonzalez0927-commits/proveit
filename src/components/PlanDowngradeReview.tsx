"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { getMaxGoalsForPlan } from "@/lib/store";
import { PLANS } from "@/types";

export function PlanDowngradeReview() {
  const { user, goals, updateGoal, setUser } = useApp();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!user?.trialExpiredNeedsReview) return null;

  const activeGoals = goals.filter((g) => !g.archivedAt);
  const limit = getMaxGoalsForPlan(user.plan ?? "free");
  const planName = PLANS.find((p) => p.id === user.plan)?.name ?? "Free";

  if (activeGoals.length <= limit) return null;

  const archiveGoal = async (goalId: string, title: string) => {
    setBusyId(goalId);
    setMessage(null);
    try {
      const result = await updateGoal(goalId, { archivedAt: new Date().toISOString() });
      if (result && "ok" in result && !result.ok) {
        setMessage(result.error);
        return;
      }
      const remaining = activeGoals.filter((g) => g.id !== goalId).length;
      if (remaining <= limit) {
        const res = await fetch("/api/profile", { credentials: "include" });
        const data = (await res.json().catch(() => ({}))) as { profile?: { trialExpiredNeedsReview?: boolean } };
        if (data.profile && user) {
          setUser({ ...user, trialExpiredNeedsReview: data.profile.trialExpiredNeedsReview === true });
        }
        setMessage(`"${title}" archived. You're within your ${planName} goal limit now.`);
      } else {
        setMessage(`"${title}" archived. Pick ${remaining - limit} more to archive.`);
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      className="rounded-2xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/35 dark:text-amber-100"
      role="status"
    >
      <p className="font-semibold">Choose which goals to keep</p>
      <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">
        Your plan is {planName} ({limit} goal{limit === 1 ? "" : "s"}). You have {activeGoals.length} active
        goals — archive {activeGoals.length - limit} to continue.
      </p>
      <ul className="mt-3 space-y-2">
        {activeGoals.map((goal) => (
          <li
            key={goal.id}
            className="flex items-center justify-between gap-3 rounded-xl bg-white/70 px-3 py-2 dark:bg-black/20"
          >
            <span className="min-w-0 truncate font-medium">{goal.title}</span>
            <button
              type="button"
              disabled={busyId === goal.id}
              onClick={() => archiveGoal(goal.id, goal.title)}
              className="shrink-0 rounded-lg border border-amber-300 px-2.5 py-1 text-xs font-semibold hover:bg-amber-100 disabled:opacity-60 dark:border-amber-600 dark:hover:bg-amber-900/40"
            >
              {busyId === goal.id ? "Archiving…" : "Archive"}
            </button>
          </li>
        ))}
      </ul>
      {message && <p className="mt-2 text-xs">{message}</p>}
    </div>
  );
}
