import { startOfWeek } from "date-fns";
import type { Goal, GraceDayEvent, ProofSubmission, User } from "@/types";
import { safeParseISO } from "@/lib/dateUtils";
import { getGoalStreak } from "@/lib/goalProgress";
import {
  getDefaultGoalPlantVariant,
  getStoredGoalPlantSelections,
  isFinalStage,
  type GoalPlantVariant,
} from "@/lib/goalPlants";
import { FULLY_GROWN_MIN_STREAK, getPlantStageForStreak } from "@/lib/plantGrowth";
import { weekStartKey, weeklyQuotaMetWithGrace } from "@/lib/graceDays";
import { hasWelcomeWeekCompleted } from "@/lib/gardenMeta";
import { isProratedSignupWeek } from "@/lib/goalSchedule";

export type AchievementTier = "free" | "pro" | "premium";

export function isProMember(user: Pick<User, "plan"> | null | undefined): boolean {
  if (!user) return false;
  return user.plan === "pro" || user.plan === "premium";
}

export function isPremiumMember(user: Pick<User, "plan"> | null | undefined): boolean {
  if (!user) return false;
  return user.plan === "premium";
}

export function isAchievementLockedByPlan(
  tier: AchievementTier,
  plan: User["plan"] | undefined
): boolean {
  if (tier === "free") return false;
  if (tier === "pro") return plan !== "pro" && plan !== "premium";
  return plan !== "premium";
}

export type AchievementId =
  | "first_goal"
  | "first_proof"
  | "welcome_week"
  | "first_full_grown"
  | "garden_3"
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
  totalGoals: number;
  totalProofs: number;
  maxStreak: number;
  activeGoals: number;
  fullyGrownPlants: number;
  perfectWeeks: number;
  shieldsUsed: number;
  weeksWithProofs: number;
  welcomeWeeksCompleted: number;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: "first_goal",
    title: "First goal",
    description: "Plant your first goal in the Garden.",
    emoji: "🎯",
    tier: "free",
  },
  {
    id: "first_proof",
    title: "First proof",
    description: "Verify your first goal with a photo.",
    emoji: "📸",
    tier: "free",
  },
  {
    id: "welcome_week",
    title: "Welcome week",
    description: "Complete your first short week after joining.",
    emoji: "🌤️",
    tier: "free",
  },
  {
    id: "first_full_grown",
    title: "Fully grown",
    description: "Grow a plant to its final stage.",
    emoji: "🌸",
    tier: "free",
  },
  {
    id: "garden_3",
    title: "Garden",
    description: "Have 3 fully grown plants.",
    emoji: "🌳",
    tier: "free",
  },
  {
    id: "proof_10",
    title: "Getting started",
    description: "Complete 10 verified proofs.",
    emoji: "🌱",
    tier: "pro",
  },
  {
    id: "proof_50",
    title: "Committed",
    description: "Complete 50 verified proofs.",
    emoji: "🔥",
    tier: "pro",
  },
  {
    id: "proof_100",
    title: "Century club",
    description: "Complete 100 verified proofs.",
    emoji: "💯",
    tier: "premium",
  },
  {
    id: "streak_7",
    title: "Week warrior",
    description: "Reach a 7-week streak on any goal.",
    emoji: "⚡",
    tier: "pro",
  },
  {
    id: "streak_30",
    title: "Unstoppable",
    description: "Reach a 30-week streak on any goal.",
    emoji: "🏆",
    tier: "premium",
  },
  {
    id: "perfect_week",
    title: "Perfect week",
    description: "Hit every active goal's weekly quota in one calendar week.",
    emoji: "✨",
    tier: "pro",
  },
  {
    id: "garden_5",
    title: "Green thumb",
    description: "Keep 5 active goals in your garden at once.",
    emoji: "🌿",
    tier: "premium",
  },
  {
    id: "shield_saver",
    title: "Shield saver",
    description: "Use a Streak Shield to protect a missed week.",
    emoji: "🛡️",
    tier: "pro",
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

function countFullyGrownPlants(
  goals: Goal[],
  getSubmissionsForGoal: StreakLookup,
  graceDayEvents: GraceDayEvent[],
  getPlantVariant: (goalId: string) => GoalPlantVariant
): number {
  let count = 0;
  for (const goal of goals) {
    const streak = getGoalStreak(goal, getSubmissionsForGoal, graceDayEvents);
    const stage = getPlantStageForStreak(streak);
    const variant = getPlantVariant(goal.id);
    if (isFinalStage(stage.stage, variant)) count += 1;
  }
  return count;
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

function countWelcomeWeeksCompleted(
  goals: Goal[],
  getSubmissionsForGoal: StreakLookup
): number {
  let count = 0;
  for (const goal of goals) {
    if (hasWelcomeWeekCompleted(goal.id)) {
      count += 1;
      continue;
    }
    const created = safeParseISO(goal.createdAt);
    if (!created) continue;
    const signupWeek = startOfWeek(created, { weekStartsOn: 0 });
    if (!isProratedSignupWeek(goal, signupWeek)) continue;
    if (
      weeklyQuotaMetWithGrace(goal, getSubmissionsForGoal(goal.id), [], signupWeek)
    ) {
      count += 1;
    }
  }
  return count;
}

export function computeAchievementStats(
  goals: Goal[],
  submissions: ProofSubmission[],
  graceDayEvents: GraceDayEvent[],
  getSubmissionsForGoal: StreakLookup,
  getPlantVariant: (goalId: string) => GoalPlantVariant = (goalId) => {
    const stored = getStoredGoalPlantSelections()[goalId];
    return stored ?? getDefaultGoalPlantVariant(goalId);
  }
): AchievementStats {
  const verified = submissions.filter((s) => s.status === "verified");
  const maxStreak = goals.reduce((max, goal) => {
    const streak = getGoalStreak(goal, getSubmissionsForGoal, graceDayEvents);
    return Math.max(max, streak);
  }, 0);

  return {
    totalGoals: goals.length,
    totalProofs: verified.length,
    maxStreak,
    activeGoals: goals.filter((g) => !g.archivedAt).length,
    fullyGrownPlants: countFullyGrownPlants(
      goals,
      getSubmissionsForGoal,
      graceDayEvents,
      getPlantVariant
    ),
    perfectWeeks: countPerfectWeeks(goals, getSubmissionsForGoal, graceDayEvents),
    shieldsUsed: graceDayEvents.length,
    weeksWithProofs: countWeeksWithProofs(submissions),
    welcomeWeeksCompleted: countWelcomeWeeksCompleted(goals, getSubmissionsForGoal),
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
  plan: User["plan"] | undefined
): { unlocked: boolean; progress: number; target: number; lockedByPlan: boolean } {
  const def = ACHIEVEMENTS.find((a) => a.id === id);
  const lockedByPlan = def ? isAchievementLockedByPlan(def.tier, plan) : false;

  const targets: Record<AchievementId, number> = {
    first_goal: 1,
    first_proof: 1,
    welcome_week: 1,
    first_full_grown: FULLY_GROWN_MIN_STREAK,
    garden_3: 3,
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
    case "first_goal":
      progress = stats.totalGoals;
      break;
    case "welcome_week":
      progress = stats.welcomeWeeksCompleted;
      break;
    case "first_proof":
    case "proof_10":
    case "proof_50":
    case "proof_100":
    case "premium_milestone":
      progress = stats.totalProofs;
      break;
    case "first_full_grown":
    case "streak_7":
    case "streak_30":
    case "premium_legend":
      progress = stats.maxStreak;
      break;
    case "perfect_week":
      progress = stats.perfectWeeks;
      break;
    case "garden_3":
      progress = stats.fullyGrownPlants;
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
  plan: User["plan"] | undefined,
  submissions: ProofSubmission[]
): AchievementProgress[] {
  const isPremium = plan === "premium";
  const maxWeekProofs = maxProofsInAnyWeek(submissions);

  return ACHIEVEMENTS.map((def) => {
    const base = evaluateAchievement(def.id, stats, plan);
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
