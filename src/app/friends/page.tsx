"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Users } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { FriendGoalCard } from "@/components/FriendGoalCard";
import type { FriendGoalGroup } from "@/lib/friendGoals";

export default function FriendsPage() {
  const { user, authReady } = useApp();
  const [groups, setGroups] = useState<FriendGoalGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/friend-goals", { credentials: "same-origin" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not load buddy goals.");
      }
      setGroups(Array.isArray(data.groups) ? data.groups : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load buddy goals.");
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setLoading(false);
      return;
    }
    void load();
  }, [authReady, user, load]);

  return (
    <main className="mx-auto max-w-lg px-4 pb-28 pt-6">
      <div className="overflow-hidden rounded-3xl border-2 border-sky-300 bg-gradient-to-br from-sky-50 via-emerald-50/80 to-lime-50/60 p-5 dark:border-sky-700 dark:from-sky-950/40 dark:via-emerald-950/30 dark:to-slate-950">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-emerald-500 text-white shadow-md">
            <Users className="h-6 w-6" strokeWidth={2.5} />
          </span>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
              Buddy goals
            </h1>
            <p className="text-sm font-medium text-sky-800 dark:text-sky-200">
              Same goal. Friendly accountability.
            </p>
          </div>
        </div>
      </div>

      {loading && (
        <p className="mt-8 text-center text-sm font-medium text-slate-500">Loading your duos…</p>
      )}

      {error && (
        <p className="mt-6 rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      )}

      {!loading && !error && groups.length === 0 && (
        <div className="mt-8 rounded-2xl border-2 border-dashed border-sky-200 bg-white/80 p-6 text-center dark:border-sky-800 dark:bg-slate-900/50">
          <Sparkles className="mx-auto h-8 w-8 text-sky-500" />
          <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
            No buddy goals yet
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            When you create a goal, turn on{" "}
            <span className="font-bold text-sky-700 dark:text-sky-300">Goal with a buddy</span> to get
            an invite link.
          </p>
          <Link
            href="/buddy"
            className="mt-5 inline-flex rounded-2xl border-b-4 border-emerald-700 bg-emerald-500 px-5 py-2.5 text-sm font-extrabold uppercase tracking-wide text-white shadow active:translate-y-0.5 active:border-b-2"
          >
            Go to garden
          </Link>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {groups.map((group) => (
          <FriendGoalCard key={group.id} group={group} />
        ))}
      </div>

      <Link
        href="/dashboard"
        className="mt-10 block text-center text-sm font-semibold text-sky-700 hover:underline dark:text-sky-300"
      >
        ← Back home
      </Link>
    </main>
  );
}
