"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Sprout } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { BuddyHubAchievements } from "@/components/buddies/BuddyHubAchievements";
import { BuddySection } from "@/components/buddies/BuddySection";
import { FriendGoalCard } from "@/components/FriendGoalCard";
import { BuddyProfileAvatar } from "@/components/BuddyProfileAvatar";
import type { FriendGoalGroup } from "@/lib/friendGoals";
import type { GoalPlantVariant } from "@/lib/goalPlants";
import type { AccentTheme } from "@/lib/theme";

interface BuddyListItem {
  userId: string;
  displayName: string;
  avatarPlant: GoalPlantVariant;
  accentTheme: AccentTheme;
}

export default function BuddiesPage() {
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
        throw new Error(typeof goalsData.error === "string" ? goalsData.error : "Could not load buddies.");
      }
      setGroups(Array.isArray(goalsData.groups) ? goalsData.groups : []);
      setBuddies(Array.isArray(buddiesData.buddies) ? buddiesData.buddies : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load buddies.");
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

  useEffect(() => {
    if (typeof window === "undefined" || !window.location.hash) return;
    const id = window.location.hash.replace("#", "");
    const el = document.getElementById(id);
    if (el) {
      window.setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    }
  }, [loading]);

  if (!authReady) {
    return (
      <main className="mx-auto max-w-lg px-4 pb-28 pt-6">
        <p className="text-center text-sm text-slate-500">Loading…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-lg px-4 pb-28 pt-6 text-center">
        <p className="text-sm text-slate-600 dark:text-slate-400">Sign in to see your buddies.</p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm font-semibold text-prove-600 hover:underline">
          Go to dashboard
        </Link>
      </main>
    );
  }

  const showEmptyGardenCta = !loading && !error && groups.length === 0 && buddies.length === 0;

  return (
    <main className="mx-auto max-w-lg space-y-8 px-4 pb-28 pt-6">
      <BuddyHubProfileCard />

      {loading && (
        <p className="text-center text-sm text-slate-500" role="status">
          Loading buddies…
        </p>
      )}

      {error && (
        <p className="rounded-2xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      )}

      <BuddySection
        id="shared-goals"
        title="Shared goals"
        description="Duos you are proving together this week."
      >
        {groups.length > 0 ? (
          <div className="space-y-3">
            {groups.map((group) => (
              <FriendGoalCard key={group.id} group={group} />
            ))}
          </div>
        ) : !loading ? (
          <div className="rounded-2xl p-5 text-center glass-card">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">No shared goals yet</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              In the garden, turn on <span className="font-semibold text-prove-700 dark:text-prove-300">Goal with a buddy</span> when you add a goal.
            </p>
            <Link
              href="/buddy"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-prove-600 px-4 py-2 text-sm font-semibold text-white hover:bg-prove-700 btn-glass-primary"
            >
              <Sprout className="h-4 w-4" />
              Go to garden
            </Link>
          </div>
        ) : null}
      </BuddySection>

      <BuddySection
        id="buddies"
        title="Your buddies"
        description="Tap someone to see their buddy profile."
      >
        {buddies.length > 0 ? (
          <ul className="space-y-2">
            {buddies.map((buddy) => (
              <li key={buddy.userId}>
                <Link
                  href={`/profile/${buddy.userId}`}
                  className="flex items-center gap-3 rounded-2xl glass-card p-3 transition hover:ring-1 hover:ring-prove-400/35"
                >
                  <BuddyProfileAvatar
                    variant={buddy.avatarPlant}
                    accentTheme={buddy.accentTheme}
                    size="md"
                    ringClassName="ring-2 ring-white/80 dark:ring-slate-900/80"
                  />
                  <span className="font-semibold text-slate-900 dark:text-white">{buddy.displayName}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : !loading ? (
          <p className="rounded-2xl px-4 py-5 text-center text-sm text-slate-500 glass-card">
            Buddies show up when you join a shared goal together.
          </p>
        ) : null}
      </BuddySection>

      <BuddyHubAchievements />

      {showEmptyGardenCta && (
        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          Start with a buddy goal in the garden — your list will fill in here.
        </p>
      )}

      <Link
        href="/dashboard"
        className="block text-center text-sm font-medium text-prove-600 hover:underline dark:text-prove-400"
      >
        ← Back home
      </Link>
    </main>
  );
}
