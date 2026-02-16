"use client";

import { useState } from "react";
import { Palette } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { getItemById } from "@/lib/buddyItems";
import { BuddyCustomizer } from "./BuddyCustomizer";

const BUDDY_STAGES = [
  { minStreak: 0, emoji: "🥚", name: "Buddy Egg", size: "text-4xl" },
  { minStreak: 1, emoji: "🐣", name: "Buddy Hatched", size: "text-5xl" },
  { minStreak: 3, emoji: "🐥", name: "Buddy Growing", size: "text-5xl" },
  { minStreak: 7, emoji: "🐓", name: "Buddy Strong", size: "text-6xl" },
  { minStreak: 14, emoji: "🦅", name: "Champion Buddy", size: "text-6xl" },
] as const;

const ENCOURAGEMENT = {
  noStreak: [
    "Complete a goal to hatch your buddy!",
    "Your buddy is waiting for you. Mark a goal done!",
    "Let's get started — your buddy believes in you!",
  ],
  hasStreak: [
    "You're on fire! Keep it going!",
    "Your buddy is so proud of you!",
    "One more day — you've got this!",
    "Consistency is key. You're doing great!",
  ],
  allDoneToday: [
    "All done for today! Your buddy is celebrating! 🎉",
    "You crushed it today. Rest up for tomorrow!",
    "Legendary. Your buddy is beaming!",
  ],
  needsMore: [
    "A few more goals today — you're so close!",
    "Your buddy is cheering you on!",
    "Almost there! Finish strong!",
  ],
} as const;

function getStage(streak: number) {
  let stage = BUDDY_STAGES[0];
  for (const s of BUDDY_STAGES) {
    if (streak >= s.minStreak) stage = s;
  }
  return stage;
}

function getMessage(
  streak: number,
  goalsDoneToday: number,
  totalDueToday: number
): string {
  const allDone = totalDueToday > 0 && goalsDoneToday >= totalDueToday;
  const seed = streak + goalsDoneToday + totalDueToday;

  if (streak === 0) {
    const msgs = ENCOURAGEMENT.noStreak;
    return msgs[seed % msgs.length];
  }
  if (allDone) {
    const msgs = ENCOURAGEMENT.allDoneToday;
    return msgs[seed % msgs.length];
  }
  if (totalDueToday > 0 && goalsDoneToday < totalDueToday) {
    const msgs = ENCOURAGEMENT.needsMore;
    return msgs[seed % msgs.length];
  }
  const msgs = ENCOURAGEMENT.hasStreak;
  return msgs[seed % msgs.length];
}

interface AccountabilityBuddyProps {
  maxStreak: number;
  goalsDoneToday: number;
  totalDueToday: number;
}

export function AccountabilityBuddy({
  maxStreak,
  goalsDoneToday,
  totalDueToday,
}: AccountabilityBuddyProps) {
  const { earnedItems, equippedItems, setEquipped } = useApp();
  const [showCustomizer, setShowCustomizer] = useState(false);
  const stage = getStage(maxStreak);
  const message = getMessage(maxStreak, goalsDoneToday, totalDueToday);
  const hatItem = equippedItems.hat ? getItemById(equippedItems.hat) : null;
  const accessoryItem = equippedItems.accessory ? getItemById(equippedItems.accessory) : null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-prove-50 to-amber-50/50 p-5 dark:border-slate-700 dark:from-prove-950/30 dark:to-amber-950/20">
      <div className="flex items-center gap-4">
        <div
          className={`relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/80 shadow-sm dark:bg-slate-800/80 ${stage.size}`}
          role="img"
          aria-label={stage.name}
        >
          {hatItem && (
            <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-2xl" aria-hidden>
              {hatItem.emoji}
            </span>
          )}
          {stage.emoji}
          {accessoryItem && (
            <span className="absolute -right-0.5 top-1/2 -translate-y-1/2 text-lg" aria-hidden>
              {accessoryItem.emoji}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900 dark:text-white">
            {stage.name}
          </p>
          <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
            {message}
          </p>
          {maxStreak > 0 && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
              {maxStreak} day{maxStreak !== 1 ? "s" : ""} streak · Keep going!
            </p>
          )}
          <button
            type="button"
            onClick={() => setShowCustomizer(true)}
            className="mt-2 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            <Palette className="h-3.5 w-3.5" />
            Customize
          </button>
        </div>
      </div>
      {showCustomizer && (
        <BuddyCustomizer
          earnedItems={earnedItems}
          equippedItems={equippedItems}
          onSetEquipped={setEquipped}
          onClose={() => setShowCustomizer(false)}
        />
      )}
    </div>
  );
}
