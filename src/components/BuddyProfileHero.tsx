"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Award, Flame, Sprout, Target } from "lucide-react";
import { BuddyProfileAvatar } from "@/components/BuddyProfileAvatar";
import { buddyProfileBackgroundStyle, type BuddyProfilePublic } from "@/lib/buddyProfile";

interface BuddyProfileHeroProps {
  profile: BuddyProfilePublic;
  compact?: boolean;
}

export function BuddyProfileHero({ profile, compact = false }: BuddyProfileHeroProps) {
  const bg = buddyProfileBackgroundStyle(profile.accentTheme);

  return (
    <article className="overflow-hidden rounded-2xl glass-card">
      <div
        className={`relative px-4 pb-4 pt-6 ${compact ? "pt-5" : "pt-8"}`}
        style={bg}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 to-transparent dark:from-black/10" />
        <div className="relative flex flex-col items-center text-center">
          <BuddyProfileAvatar variant={profile.avatarPlant} size="lg" />
          <h1 className="mt-4 font-display text-2xl font-bold text-slate-900 dark:text-white">
            {profile.displayName}
          </h1>
          {profile.username && (
            <p className="text-sm font-medium text-slate-700/90 dark:text-slate-200/90">
              @{profile.username}
            </p>
          )}
          {profile.isYou && (
            <span className="mt-2 rounded-full bg-white/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-prove-800 dark:bg-slate-900/70 dark:text-prove-200">
              Your profile
            </span>
          )}
        </div>
      </div>

      <div className={`grid grid-cols-2 gap-2 border-t border-slate-200/70 p-4 dark:border-slate-700/60 ${compact ? "gap-1.5 p-3" : ""}`}>
        <StatPill icon={<Target className="h-4 w-4" />} label="Active goals" value={profile.stats.activeGoals} />
        <StatPill icon={<Award className="h-4 w-4" />} label="Badges" value={profile.stats.unlockedAchievements} />
        <StatPill icon={<Flame className="h-4 w-4" />} label="Best streak" value={profile.stats.maxStreak} />
        <StatPill icon={<Sprout className="h-4 w-4" />} label="Proofs this week" value={profile.stats.proofsThisWeek} />
      </div>

      {profile.sharedGoalTitles.length > 0 && (
        <div className="border-t border-slate-200/70 px-4 py-3 dark:border-slate-700/60">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Buddy goals together
          </p>
          <ul className="mt-2 space-y-1">
            {profile.sharedGoalTitles.map((title) => (
              <li key={title} className="text-sm font-medium text-slate-800 dark:text-slate-100">
                {title}
              </li>
            ))}
          </ul>
        </div>
      )}

      {profile.isYou && (
        <div className="border-t border-slate-200/70 px-4 py-3 dark:border-slate-700/60">
          <Link
            href="/settings"
            className="text-sm font-semibold text-prove-700 hover:underline dark:text-prove-300"
          >
            Edit buddy profile in Settings →
          </Link>
        </div>
      )}
    </article>
  );
}

function StatPill({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white/60 px-3 py-2 dark:border-slate-700/50 dark:bg-slate-950/40">
      <div className="flex items-center gap-1.5 text-prove-600 dark:text-prove-400">{icon}</div>
      <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}
