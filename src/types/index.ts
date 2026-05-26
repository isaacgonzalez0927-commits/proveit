export type PlanId = "free" | "pro" | "premium";

export function normalizePlanId(plan: unknown): PlanId {
  if (plan === "premium") return "premium";
  if (plan === "pro") return "pro";
  return "free";
}

export interface Plan {
  id: PlanId;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  /** Max total goals (any frequency). -1 = unlimited. */
  maxGoals: number;
  features: string[];
  stripePriceId?: string;
}

export interface User {
  id: string;
  email: string;
  plan: PlanId;
  createdAt: string;
  /** Set while a one-time Premium trial is counting down (ISO). */
  premiumTrialEndsAt?: string | null;
  premiumTrialUsed?: boolean;
  graceDayBalance?: number;
  graceDayCycleAnchor?: string | null;
  strictAiVerification?: boolean;
  trialExpiredNeedsReview?: boolean;
  aiVerificationCycleKey?: string | null;
  aiVerificationCount?: number;
}

export type GoalFrequency = "daily" | "weekly";

/** Times per week user must submit proof (1–7). 7 = every day, 1 = once per week. */
export type TimesPerWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** How long after the due time you can still submit proof */
export type GracePeriod = "1h" | "3h" | "6h" | "12h" | "eod";

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  frequency: GoalFrequency;
  /** How many times per week proof must be submitted (1–7). 7 = every day. */
  timesPerWeek?: TimesPerWeek;
  reminderTime?: string; // HH:mm
  /** Whether this goal's reminder should fire under the user's plan limit. */
  reminderIsActive?: boolean;
  /** @deprecated use reminderDays; 0-6 for weekly (0 = Sunday) */
  reminderDay?: number;
  /** Which days of the week (0–6, 0=Sun) to get a reminder. Daily = all 7; weekly = selected days (can do multiple per week). */
  reminderDays?: number[];
  /** How long after due time to submit: 1h, 3h, 6h, 12h, or eod (end of day) */
  gracePeriod?: GracePeriod;
  /** Stored suggestion triple for legacy/schema compatibility; verification uses the goal title. */
  proofSuggestions?: string[];
  /** Stored copy of the proof line (kept in sync with title for new goals). */
  proofRequirement?: string;
  /** Pro-only: freeze streak/growth while goal is paused */
  isOnBreak?: boolean;
  breakStartedAt?: string;
  breakStreakSnapshot?: number;
  streakCarryover?: number;
  /** Pro: completed break sessions — calendar days on break per month key `yyyy-MM` (resets conceptually each month). */
  proBreakUsageByMonth?: Record<string, number>;
  /** Soft-disable extra goals when a trial/free downgrade requires choosing which goals to keep. */
  archivedAt?: string;
  createdAt: string;
  completedDates: string[]; // ISO date strings when verified
}

export interface ProofSubmission {
  id: string;
  goalId: string;
  date: string; // ISO date
  imageDataUrl: string;
  status: "pending" | "verified" | "rejected";
  aiFeedback?: string;
  verifiedAt?: string;
  createdAt: string;
}

export interface GraceDayEvent {
  id: string;
  userId: string;
  goalId: string;
  weekStart: string;
  missedDate?: string;
  usedAt: string;
  reason?: string;
  createdAt: string;
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    priceYearly: 0,
    maxGoals: 2,
    features: [
      "2 goals",
      "Weekly garden growth",
      "3 plant styles to choose from",
      "3 standard AI checks per week",
      "Up to 2 active reminders",
      "Simple weekly targets",
      "Plant growth & streak tracking",
      "Dashboard & watering progress",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 0,
    priceYearly: 0,
    maxGoals: 5,
    features: [
      "5 goals",
      "Temporarily free until Stripe is ready",
      "6 plant styles (including strawberry)",
      "6 accent themes (Pink, Violet, Ocean, Teal, Orange, Amber + more)",
      "Strict AI verification option with richer feedback",
      "Up to 5 active reminders",
      "3 Streak Shields per billing cycle",
      "100 AI checks per month",
      "Goal Break (7 break-days per calendar month, per goal)",
      "Goal Gallery (history, proof photos, streaks)",
      "Priority support",
    ],
    stripePriceId: "price_pro_monthly",
  },
  {
    id: "premium",
    name: "Premium",
    priceMonthly: 0,
    priceYearly: 0,
    maxGoals: -1,
    features: [
      "Temporarily free until Stripe is ready",
      "Unlimited goals",
      "All 8 plant styles (including cactus)",
      "All 10 accent themes",
      "Strict AI verification option with richer feedback",
      "7 Streak Shields per billing cycle",
      "Generous AI fair use (500 checks per month)",
      "Goal Break for any duration",
      "Unlimited Goal Gallery with weekly photo collages",
      "Exclusive achievements & rewards",
      "Priority & dedicated support",
    ],
    stripePriceId: "price_premium_monthly",
  },
];
