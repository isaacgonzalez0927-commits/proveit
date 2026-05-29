"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
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
        throw new Error(typeof data.error === "string" ? data.error : "Could not load friend goals.");
      }
      setGroups(Array.isArray(data.groups) ? data.groups : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load friend goals.");
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
      <div className="flex items-center gap-2">
        <Users className="h-6 w-6 text-prove-600 dark:text-prove-400" />
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Friend goals</h1>
      </div>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Do the same goal with someone and see each other&apos;s progress for the week.
      </p>

      {loading && (
        <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">Loading…</p>
      )}

      {error && (
        <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      )}

      {!loading && !error && groups.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-6 text-center dark:border-slate-600 dark:bg-slate-900/40">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No friend goals yet. Open a goal in your garden and tap{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">Invite friend</span> to
            send a link.
          </p>
          <Link
            href="/buddy"
            className="mt-4 inline-block text-sm font-semibold text-prove-600 hover:underline dark:text-prove-400"
          >
            Go to Goal Garden →
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
        className="mt-10 block text-center text-sm text-prove-600 hover:underline dark:text-prove-400"
      >
        ← Back to dashboard
      </Link>
    </main>
  );
}
