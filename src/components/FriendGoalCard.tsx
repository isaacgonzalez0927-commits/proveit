"use client";

import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import type { FriendGoalGroup } from "@/lib/friendGoals";

interface FriendGoalCardProps {
  group: FriendGoalGroup;
}

export function FriendGoalCard({ group }: FriendGoalCardProps) {
  const partner = group.members.find((m) => !m.isYou);
  const you = group.members.find((m) => m.isYou);
  const waitingForPartner = group.memberCount < group.maxMembers;

  return (
    <article className="rounded-2xl border border-slate-200/70 p-4 shadow-soft glass-card dark:border-slate-700/60">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate font-semibold text-slate-900 dark:text-white">{group.title}</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {group.timesPerWeek >= 7
              ? "Daily goal"
              : `${group.timesPerWeek}× per week`}
            {waitingForPartner ? " · waiting for a friend" : " · friend goal"}
          </p>
        </div>
        {you?.goalId && (
          <Link
            href={`/goals/submit?goalId=${encodeURIComponent(you.goalId)}`}
            className="shrink-0 rounded-lg bg-prove-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-prove-700"
          >
            Prove it
          </Link>
        )}
      </div>

      <ul className="mt-4 space-y-3">
        {group.members.map((member) => (
          <li
            key={member.userId}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/60 bg-white/50 px-3 py-2.5 dark:border-slate-700/50 dark:bg-slate-900/30"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                {member.displayName}
                {member.isYou && (
                  <span className="ml-1 text-xs font-normal text-slate-500 dark:text-slate-400">
                    (you)
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                This week: {member.weekDone}/{member.weekTarget}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 text-xs font-medium">
              {member.provedToday ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-700 dark:text-emerald-300">Today</span>
                </>
              ) : (
                <>
                  <Circle className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                  <span className="text-slate-500">Not yet</span>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      {waitingForPartner && (
        <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
          Share your invite from the garden so a friend can join
          {partner ? "" : "."}.
        </p>
      )}
    </article>
  );
}
