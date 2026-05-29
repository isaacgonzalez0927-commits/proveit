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
    <article className="overflow-hidden rounded-2xl border-2 border-sky-200/90 bg-white shadow-sm dark:border-sky-800/60 dark:bg-slate-900/80">
      <div className="border-b border-sky-100 bg-gradient-to-r from-sky-50 to-emerald-50/80 px-4 py-3 dark:border-sky-900 dark:from-sky-950/50 dark:to-emerald-950/30">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate font-display text-lg font-bold text-slate-900 dark:text-white">
              {group.title}
            </h2>
            <p className="mt-0.5 text-xs font-semibold text-sky-800 dark:text-sky-200">
              {group.timesPerWeek >= 7
                ? "Daily duo"
                : `${group.timesPerWeek}× per week`}
              {waitingForPartner ? " · waiting for buddy" : " · duo active"}
            </p>
          </div>
          {you?.goalId && (
            <Link
              href={`/goals/submit?goalId=${encodeURIComponent(you.goalId)}`}
              className="shrink-0 rounded-xl border-b-[3px] border-emerald-700 bg-emerald-500 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-white active:translate-y-0.5 active:border-b"
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
            className="flex items-center justify-between gap-3 rounded-xl border-2 border-slate-100 bg-slate-50/80 px-3 py-2.5 dark:border-slate-700/50 dark:bg-slate-950/40"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                {member.displayName}
                {member.isYou && (
                  <span className="ml-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400">
                    (you)
                  </span>
                )}
              </p>
              <p className="text-xs font-medium text-slate-500">
                This week: {member.weekDone}/{member.weekTarget}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide">
              {member.provedToday ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Done</span>
                </>
              ) : (
                <>
                  <Circle className="h-4 w-4 text-slate-300" />
                  <span className="text-slate-400">Not yet</span>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      {waitingForPartner && (
        <p className="border-t border-slate-100 px-4 py-2.5 text-center text-[11px] font-semibold text-sky-700 dark:border-slate-800 dark:text-sky-300">
          Send your invite from the garden — your buddy joins with one tap
        </p>
      )}
    </article>
  );
}
