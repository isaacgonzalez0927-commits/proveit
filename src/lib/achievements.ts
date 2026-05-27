import { startOfWeek } from "date-fns";
import type { Goal, GraceDayEvent, ProofSubmission, User } from "@/types";
import { safeParseISO } from "@/lib/dateUtils";
import { getGoalStreak } from "@/lib/goalProgress";
import { weekStartKey, weeklyQuotaMetWithGrace } from "@/lib/graceDays";
import { isPremiumTrialActive } from "@/lib/premiumTrial";

export type AchievementTier = "standard" | "premium";

export type AchievementId =
  | "first_proof"
  | "proof_10"
  | "proof_50"
  | "proof_100"
  | "streak_7"
  | "streak_30"
  | "perfect_week"
  | "garden_5"
  | "shield_saver"
  | "premium_collector"
  | "premium_milestone"
  | "premium_legend";

export interface AchievementDefinition {
  id: AchievementId;
  title: string;
  description: string;
  emoji: string;
  tier: AchievementTier;
}

export interface AchievementProgress {
  id: AchievementId;
  unlocked: boolean;
  progress: number;
  target: number;
  lockedByPlan: boolean;
}

export interface AchievementStats {
  totalProofs: number;
  maxStreak: number;
  activeGoals: number;
  perfectWeeks: number;
  shieldsUsed: number;
  weeksWithProofs: number;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: "first_proof",
    title: "First proof",
    description: "Verify your first goal with a photo.",
    emoji: "📸",
    tier: "standard",
  },
  {
    id: "proof_10",
    title: "Getting started",
    description: "Complete 10 verified proofs.",
    emoji: "🌱",
    tier: "standard",
  },
  {
    id: "proof_50",
    title: "Committed",
    description: "Complete 50 verified proofs.",
    emoji: "🔥",
    tier: "standard",
  },
  {
    id: "proof_100",
    title: "Century club",
    description: "Complete 100 verified proofs.",
    emoji: "💯",
    tier: "standard",
  },
  {
    id: "streak_7",
    title: "Week warrior",
    description: "Reach a 7-day or 7-week streak on any goal.",
    emoji: "⚡",
    tier: "standard",
  },
  {
    id: "streak_30",
    title: "Unstoppable",
    description: "Reach a 30-day or 30-week streak on any goal.",
    emoji: "🏆",
    tier: "standard",
  },
  {
    id: "perfect_week",
    title: "Perfect week",
    description: "Hit every active goal's weekly quota in one calendar week.",
    emoji: "✨",
    tier: "standard",
  },
  {
    id: "garden_5",
    title: "Green thumb",
    description: "Keep 5 active goals in your garden at once.",
    emoji: "🌿",
    tier: "standard",
  },
  {
    id: "shield_saver",
    title: "Shield saver",
    description: "Use a Streak Shield to protect a missed week.",
    emoji: "🛡️",
    tier: "standard",
  },
  {
    id: "premium_collector",
    title: "Proof collector",
    description: "Fill a weekly photo collage with 7+ proofs.",
    emoji: "🖼️",
    tier: "premium",
  },
  {
    id: "premium_milestone",
    title: "Premium milestone",
    description: "Complete 200 verified proofs as a Premium member.",
    emoji: "👑",
    tier: "premium",
  },
  {
    id: "premium_legend",
    title: "Garden legend",
    description: "Reach a 52-week streak on any goal as Premium.",
    emoji: "💎",
    tier: "premium",
  },
];

export function isPremiumMember(user: Pick<User, "plan" | "premiumTrialEndsAt"> | null | undefined): boolean {
  if (!user) return false;
  return user.plan === "premium" || isPremiumTrialActive(user);
}

type StreakLookup = (goalId: string) => ProofSubmission[];

function collectWeekKeys(
  goals: Goal[],
  getSubmissionsForGoal: StreakLookup,
  referenceDate: Date
): string[] {
  const keys = new Set<string>();
  keys.add(weekStartKey(referenceDate));
  for (const goal of goals) {
    if (goal.archivedAt) continue;
    for (const sub of getSubmissionsForGoal(goal.id)) {
      if (sub.status !== "verified") continue;
      const d = safeParseISO(sub.date);
      if (!d) continue;
      keys.add(weekStartKey(d));
    }
  }
  return [...keys];
}

function countPerfectWeeks(
  goals: Goal[],
  getSubmissionsForGoal: StreakLookup,
  graceDayEvents: GraceDayEvent[],
  referenceDate: Date = new Date()
): number {
  const activeGoals = goals.filter((g) => !g.archivedAt);
  if (activeGoals.length === 0) return 0;

  let perfect = 0;
  for (const key of collectWeekKeys(activeGoals, getSubmissionsForGoal, referenceDate)) {
    const weekDate = safeParseISO(key);
    if (!weekDate) continue;
    const allMet = activeGoals.every((goal) =>
      weeklyQuotaMetWithGrace(goal, getSubmissionsForGoal(goal.id), graceDayEvents, weekDate)
    );
    if (allMet) perfect += 1;
  }
  return perfect;
}

function countWeeksWithProofs(submissions: ProofSubmission[]): number {
  const weeks = new Set<string>();
  for (const sub of submissions) {
    if (sub.status !== "verified") continue;
    const d = safeParseISO(sub.date);
    if (!d) continue;
    weeks.add(startOfWeek(d, { weekStartsOn: 0 }).toISOString().slice(0, 10));
  }
  return weeks.size;
}

export function computeAchievementStats(
  goals: Goal[],
  submissions: ProofSubmission[],
  graceDayEvents: GraceDayEvent[],
  getSubmissionsForGoal: StreakLookup
): AchievementStats {
  const verified = submissions.filter((s) => s.status === "verified");
  const maxStreak = goals.reduce((max, goal) => {
    const streak = getGoalStreak(goal, getSubmissionsForGoal, graceDayEvents);
    return Math.max(max, streak);
  }, 0);

  return {
    totalProofs: verified.length,
    maxStreak,
    activeGoals: goals.filter((g) => !g.archivedAt).length,
    perfectWeeks: countPerfectWeeks(goals, getSubmissionsForGoal, graceDayEvents),
    shieldsUsed: graceDayEvents.length,
    weeksWithProofs: countWeeksWithProofs(submissions),
  };
}

function maxProofsInAnyWeek(submissions: ProofSubmission[]): number {
  const byWeek = new Map<string, number>();
  for (const sub of submissions) {
    if (sub.status !== "verified") continue;
    const d = safeParseISO(sub.date);
    if (!d) continue;
    const key = startOfWeek(d, { weekStartsOn: 0 }).toISOString().slice(0, 10);
    byWeek.set(key, (byWeek.get(key) ?? 0) + 1);
  }
  return Math.max(0, ...byWeek.values(), 0);
}

export function evaluateAchievement(
  id: AchievementId,
  stats: AchievementStats,
  isPremium: boolean
): { unlocked: boolean; progress: number; target: number; lockedByPlan: boolean } {
  const def = ACHIEVEMENTS.find((a) => a.id === id);
  const lockedByPlan = def?.tier === "premium" && !isPremium;

  const targets: Record<AchievementId, number> = {
    first_proof: 1,
    proof_10: 10,
    proof_50: 50,
    proof_100: 100,
    streak_7: 7,
    streak_30: 30,
    perfect_week: 1,
    garden_5: 5,
    shield_saver: 1,
    premium_collector: 7,
    premium_milestone: 200,
    premium_legend: 52,
  };

  const target = targets[id];
  let progress = 0;

  switch (id) {
    case "first_proof":
    case "proof_10":
    case "proof_50":
    case "proof_100":
    case "premium_milestone":
      progress = stats.totalProofs;
      break;
    case "streak_7":
    case "streak_30":
    case "premium_legend":
      progress = stats.maxStreak;
      break;
    case "perfect_week":
      progress = stats.perfectWeeks;
      break;
    case "garden_5":
      progress = stats.activeGoals;
      break;
    case "shield_saver":
      progress = stats.shieldsUsed;
      break;
    default:
      progress = 0;
  }

  const unlocked = !lockedByPlan && progress >= target;
  return { unlocked, progress: Math.min(progress, target), target, lockedByPlan };
}

export function evaluateAllAchievements(
  stats: AchievementStats,
  isPremium: boolean,
  submissions: ProofSubmission[]
): AchievementProgress[] {
  const maxWeekProofs = maxProofsInAnyWeek(submissions);

  return ACHIEVEMENTS.map((def) => {
    const base = evaluateAchievement(def.id, stats, isPremium);
    if (def.id === "premium_collector") {
      const progress = Math.min(maxWeekProofs, 7);
      return {
        id: def.id,
        unlocked: isPremium && maxWeekProofs >= 7,
        progress,
        target: 7,
        lockedByPlan: !isPremium,
      };
    }
    return { id: def.id, ...base };
  });
}

export function countUnlockedAchievements(progress: AchievementProgress[]): number {
  return progress.filter((p) => p.unlocked).length;
}

export function getAchievementById(id: AchievementId): AchievementDefinition | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

/** Premium-only buddy cosmetic IDs unlocked via achievements (local storage). */
export const PREMIUM_ACHIEVEMENT_REWARDS: Partial<Record<AchievementId, string>> = {
  premium_collector: "gold_crown",
  premium_milestone: "diamond_star",
  premium_legend: "legend_cape",
};

export function premiumRewardsForUnlocked(progress: AchievementProgress[]): string[] {
  return progress
    .filter((p) => p.unlocked)
    .map((p) => PREMIUM_ACHIEVEMENT_REWARDS[p.id])
    .filter((id): id is string => typeof id === "string");
}
