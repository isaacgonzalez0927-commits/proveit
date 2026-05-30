"use client";

import type { ReactNode } from "react";
import { Award, Flame, Sprout, Target } from "lucide-react";
import { BuddyProfileAvatar } from "@/components/BuddyProfileAvatar";
import { buddyProfileBackgroundStyle, type BuddyProfilePublic } from "@/lib/buddyProfile";

interface BuddyProfileHeroProps {
  profile: BuddyProfilePublic;
  compact?: boolean;
  fullScreen?: boolean;
  /** Parent renders accent wash (full-screen profile page). */
  omitHeaderGlow?: boolean;
}

export function BuddyProfileHero({
  profile,
  compact = false,
  fullScreen = false,
  omitHeaderGlow = false,
}: BuddyProfileHeroProps) {
  const accentGlow = buddyProfileBackgroundStyle(profile.accentTheme);

  const header = (
    <div
      className={`relative flex flex-col items-center px-4 pb-1 text-center ${
        omitHeaderGlow ? "pt-0" : "pt-2"
      }`}
    >
      {!omitHeaderGlow && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-40 [-webkit-mask-image:linear-gradient(to_bottom,black_55%,transparent_100%)] [mask-image:linear-gradient(to_bottom,black_55%,transparent_100%)]"
          style={accentGlow}
          aria-hidden
        />
      )}
      <div className="relative">
        <BuddyProfileAvatar
          variant={profile.avatarPlant}
          accentTheme={profile.accentTheme}
          size={compact ? "md" : "lg"}
        />
      </div>
      <h1
        className={`mt-4 font-display font-bold tracking-tight text-slate-900 dark:text-white ${
          compact ? "text-xl" : fullScreen ? "text-2xl" : "text-2xl"
        }`}
      >
        {profile.displayName}
      </h1>
      {profile.username && (
        <p className="mt-0.5 text-sm font-medium text-slate-500 dark:text-slate-400">
          @{profile.username}
        </p>
      )}
      {profile.isYou && (
        <span className="mt-2.5 inline-flex rounded-full border border-prove-200/80 bg-prove-50/90 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-prove-800 dark:border-prove-800/50 dark:bg-prove-950/50 dark:text-prove-200">
          Your profile
        </span>
      )}
    </div>
  );

  const stats = (
    <div className={`grid grid-cols-4 divide-x divide-slate-200/80 dark:divide-slate-700/60 ${compact ? "py-3" : "py-4"}`}>
      <StatCell icon={<Target className="h-4 w-4" />} label="Goals" value={profile.stats.activeGoals} />
      <StatCell icon={<Award className="h-4 w-4" />} label="Badges" value={profile.stats.unlockedAchievements} />
      <StatCell
        icon={<Flame className="h-4 w-4" />}
        label="Streak"
        value={profile.stats.maxStreak}
        suffix={profile.stats.maxStreak === 1 ? "wk" : "wks"}
      />
      <StatCell icon={<Sprout className="h-4 w-4" />} label="This week" value={profile.stats.proofsThisWeek} />
    </div>
  );

  const sharedGoals =
    profile.sharedGoalTitles.length > 0 ? (
      <div className={`border-t border-slate-200/70 dark:border-slate-700/60 ${compact ? "px-3 py-3" : "px-4 py-4"}`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          Buddy goals together
        </p>
        <ul className="mt-2.5 flex flex-wrap gap-2">
          {profile.sharedGoalTitles.map((title) => (
            <li
              key={title}
              className="rounded-full border border-slate-200/80 bg-white/50 px-3 py-1 text-xs font-semibold text-slate-800 dark:border-slate-600/60 dark:bg-slate-900/40 dark:text-slate-100"
            >
              {title}
            </li>
          ))}
        </ul>
      </div>
    ) : null;

  if (fullScreen) {
    return (
      <div className="mx-auto w-full max-w-lg space-y-4 px-4">
        {header}
        <article className="overflow-hidden rounded-2xl glass-card">
          {stats}
          {sharedGoals}
        </article>
      </div>
    );
  }

  return (
    <article className="overflow-hidden rounded-2xl glass-card">
      <div className={compact ? "pt-4" : "pt-6"}>{header}</div>
      <div className="border-t border-slate-200/70 dark:border-slate-700/60">{stats}</div>
      {sharedGoals}
    </article>
  );
}

function StatCell({
  icon,
  label,
  value,
  suffix,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center px-1 text-center">
      <span className="text-prove-600 dark:text-prove-400">{icon}</span>
      <p className="mt-1 text-lg font-bold tabular-nums leading-none text-slate-900 dark:text-white">
        {value}
        {suffix ? (
          <span className="ml-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            {suffix}
          </span>
        ) : null}
      </p>
      <p className="mt-1 text-[10px] font-medium leading-tight text-slate-500 dark:text-slate-400">
        {label}
      </p>
    </div>
  );
}
