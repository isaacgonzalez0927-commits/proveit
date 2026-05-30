"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Sprout, Users } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { FriendGoalCard } from "@/components/FriendGoalCard";
import { PlantIllustration } from "@/components/PlantIllustration";
import { buddyProfileBackgroundStyle } from "@/lib/buddyProfile";
import type { FriendGoalGroup } from "@/lib/friendGoals";
import type { GoalPlantVariant } from "@/lib/goalPlants";
import type { AccentTheme } from "@/lib/theme";

interface BuddyListItem {
  userId: string;
  displayName: string;
  avatarPlant: GoalPlantVariant;
  accentTheme: AccentTheme;
}

export default function FriendsPage() {
  const { user, authReady } = useApp();
  const [groups, setGroups] = useState<FriendGoalGroup[]>([]);
  const [buddies, setBuddies] = useState<BuddyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [goalsRes, buddiesRes] = await Promise.all([
        fetch("/api/friend-goals", { credentials: "same-origin" }),
        fetch("/api/buddy-profile/buddies", { credentials: "same-origin" }),
      ]);
      const goalsData = await goalsRes.json().catch(() => ({}));
      const buddiesData = await buddiesRes.json().catch(() => ({}));
      if (!goalsRes.ok) {
        throw new Error(typeof goalsData.error === "string" ? goalsData.error : "Could not load buddy goals.");
      }
      setGroups(Array.isArray(goalsData.groups) ? goalsData.groups : []);
      setBuddies(Array.isArray(buddiesData.buddies) ? buddiesData.buddies : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load buddy goals.");
      setGroups([]);
      setBuddies([]);
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
      <header className="rounded-2xl p-5 glass-card">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-prove-100 text-prove-700 dark:bg-prove-950/60 dark:text-prove-300">
            <Users className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              Buddy goals
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Same goal. Cheer each other on.
            </p>
          </div>
        </div>
      </header>

      {user?.id && (
        <Link
          href={`/profile/${user.id}`}
          className="mt-4 block rounded-2xl border border-prove-200/80 bg-prove-50/50 px-4 py-3 text-sm font-semibold text-prove-800 hover:bg-prove-50 dark:border-prove-800/50 dark:bg-prove-950/30 dark:text-prove-200"
        >
          View your buddy profile →
        </Link>
      )}

      {buddies.length > 0 && (
        <section className="mt-6">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Your buddies
          </h2>
          <ul className="mt-3 space-y-2">
            {buddies.map((buddy) => (
              <li key={buddy.userId}>
                <Link
                  href={`/profile/${buddy.userId}`}
                  className="flex items-center gap-3 overflow-hidden rounded-2xl glass-card p-3 transition hover:ring-1 hover:ring-prove-400/40"
                >
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"
                    style={buddyProfileBackgroundStyle(buddy.accentTheme)}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 dark:bg-slate-900/90">
                      <PlantIllustration
                        stage="leafy"
                        wateringLevel={0.6}
                        wateredGoals={0}
                        variant={buddy.avatarPlant}
                        size="small"
                      />
                    </div>
                  </div>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {buddy.displayName}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {loading && (
        <p className="mt-8 text-center text-sm text-slate-500">Loading your duos…</p>
      )}

      {error && (
        <p className="mt-6 rounded-2xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      )}

      {!loading && !error && groups.length === 0 && (
        <div className="mt-6 rounded-2xl p-6 text-center glass-card">
          <Users className="mx-auto h-8 w-8 text-prove-500" />
          <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
            No buddy goals yet
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            When you create a goal in the garden, turn on{" "}
            <span className="font-medium text-prove-700 dark:text-prove-300">Goal with a buddy</span>{" "}
            to get an invite link.
          </p>
          <Link
            href="/buddy"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-prove-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-prove-700 btn-glass-primary"
          >
            <Sprout className="h-4 w-4" />
            Go to garden
          </Link>
        </div>
      )}

      {groups.length > 0 && (
        <section className="mt-8">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Shared goals
          </h2>
          <div className="mt-3 space-y-4">
            {groups.map((group) => (
              <FriendGoalCard key={group.id} group={group} />
            ))}
          </div>
        </section>
      )}

      <Link
        href="/dashboard"
        className="mt-10 block text-center text-sm font-medium text-prove-600 hover:underline dark:text-prove-400"
      >
        ← Back home
      </Link>
    </main>
  );
}
