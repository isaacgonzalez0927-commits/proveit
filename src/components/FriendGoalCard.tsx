"use client";

import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import type { FriendGoalGroup } from "@/lib/friendGoals";

interface FriendGoalCardProps {
  group: FriendGoalGroup;
}

export function FriendGoalCard({ group }: FriendGoalCardProps) {
  const you = group.members.find((m) => m.isYou);
  const waitingForPartner = group.memberCount < group.maxMembers;

  return (
    <article className="overflow-hidden rounded-2xl glass-card">
      <div className="border-b border-slate-200/70 px-4 py-3 dark:border-slate-700/60">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate font-display text-lg font-semibold text-slate-900 dark:text-white">
              {group.title}
            </h2>
            <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              {group.timesPerWeek >= 7
                ? "Daily duo"
                : `${group.timesPerWeek}× per week`}
              {waitingForPartner ? " · waiting for buddy" : " · duo active"}
            </p>
          </div>
          {you?.goalId && (
            <Link
              href={`/goals/submit?goalId=${encodeURIComponent(you.goalId)}`}
              className="shrink-0 rounded-lg bg-prove-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-prove-700 btn-glass-primary"
            >
              Prove it
            </Link>
          )}
        </div>
      </div>

      <ul className="space-y-2 p-4">
        {group.members.map((member) => (
          <li
            key={member.userId}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-white/50 px-3 py-2.5 dark:border-slate-700/50 dark:bg-slate-950/30"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {member.isYou ? (
                  member.displayName
                ) : (
                  <Link
                    href={`/profile/${member.userId}`}
                    className="hover:text-prove-700 hover:underline dark:hover:text-prove-300"
                  >
                    {member.displayName}
                  </Link>
                )}
                {member.isYou && (
                  <span className="ml-1.5 text-xs font-medium text-prove-600 dark:text-prove-400">
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
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Done</span>
                </>
              ) : (
                <>
                  <Circle className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                  <span className="text-slate-400">Not yet</span>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      {waitingForPartner && (
        <p className="border-t border-slate-200/70 px-4 py-2.5 text-center text-[11px] font-medium text-slate-500 dark:border-slate-700/60 dark:text-slate-400">
          Share your invite from the garden — your buddy joins with one tap
        </p>
      )}
    </article>
  );
}
