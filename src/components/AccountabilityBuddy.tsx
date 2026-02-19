"use client";

import Link from "next/link";
import { PlantIllustration, type PlantStageKey } from "./PlantIllustration";

const PLANT_STAGES: { minStreak: number; stage: PlantStageKey; name: string }[] = [
  { minStreak: 0, stage: "seedling", name: "Seedling" },
  { minStreak: 7, stage: "sprout", name: "Sprout" },
  { minStreak: 14, stage: "leafy", name: "Leafy Plant" },
  { minStreak: 30, stage: "blooming", name: "Blooming Plant" },
  { minStreak: 60, stage: "thriving", name: "Thriving Plant" },
  { minStreak: 100, stage: "flowering", name: "Flowering Garden" },
];

const ENCOURAGEMENT = {
  noStreak: [
    "Complete a goal to water your plant for the first time.",
    "Your plant is ready. Mark a goal done to give it water.",
    "Let's start growing your garden today.",
  ],
  hasStreak: [
    "Steady progress. Your plant keeps growing.",
    "Your consistency is paying off.",
    "One more completed goal and your plant gets stronger.",
    "Keep watering with daily wins.",
  ],
  allDoneToday: [
    "All goals done today. Your plant is fully watered. 🎉",
    "You crushed it today. Your plant looks healthy.",
    "Great work. Your garden is thriving today.",
  ],
  needsMore: [
    "A few more goals today and your plant will perk up.",
    "Water level is rising. Keep going.",
    "Almost there. Finish strong and hydrate your plant.",
  ],
} as const;

function getStage(streak: number): (typeof PLANT_STAGES)[number] {
  let result: (typeof PLANT_STAGES)[number] = PLANT_STAGES[0];
  for (const s of PLANT_STAGES) {
    if (streak >= s.minStreak) result = s;
  }
  return result;
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
  /** When true, shows larger illustration (for dedicated Buddy page) */
  large?: boolean;
}

export function AccountabilityBuddy({
  maxStreak,
  goalsDoneToday,
  totalDueToday,
  large = false,
}: AccountabilityBuddyProps) {
  const stage = getStage(maxStreak);
  const message = getMessage(maxStreak, goalsDoneToday, totalDueToday);
  const wateringLevel =
    totalDueToday > 0 ? Math.min(1, goalsDoneToday / totalDueToday) : maxStreak > 0 ? 1 : 0;
  const wateringLabel =
    totalDueToday > 0
      ? `${goalsDoneToday}/${totalDueToday} goal${totalDueToday !== 1 ? "s" : ""} watered today`
      : "No goals due today — your plant is resting.";

  return (
    <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-cyan-50/60 p-5 dark:border-emerald-900/70 dark:from-emerald-950/35 dark:to-cyan-950/20">
      <div className={large ? "flex flex-col items-center text-center" : "flex items-center gap-4"}>
        <div
          className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/80 shadow-sm dark:bg-slate-800/80 ${large ? "h-64 w-64 sm:h-72 sm:w-72" : "h-40 w-40 sm:h-48 sm:w-48"}`}
          role="img"
          aria-label={stage.name}
        >
          <PlantIllustration
            size={large ? "large" : "default"}
            stage={stage.stage}
            wateringLevel={wateringLevel}
            wateredGoals={goalsDoneToday}
          />
        </div>
        <div className={large ? "mt-4 w-full" : "min-w-0 flex-1"}>
          <p className="font-semibold text-slate-900 dark:text-white">
            {stage.name}
          </p>
          <p className={`text-sm text-slate-600 dark:text-slate-400 ${large ? "mt-1" : "mt-0.5"}`}>
            {message}
          </p>
          {maxStreak > 0 && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
              {maxStreak} day{maxStreak !== 1 ? "s" : ""} streak · Keep going!
            </p>
          )}
          <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
            {wateringLabel}
          </p>
          <div className={`flex flex-wrap gap-2 ${large ? "mt-4 justify-center" : "mt-3"}`}>
            {!large && (
              <Link
                href="/buddy"
                className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
              >
                View full plant →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
