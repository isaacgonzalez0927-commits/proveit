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
  dailyGoals: number;
  weeklyGoals: number;
  features: string[];
  stripePriceId?: string;
}

export interface User {
  id: string;
  email: string;
  plan: PlanId;
  createdAt: string;
}

export type GoalFrequency = "daily" | "weekly";

/** How long after the due time you can still submit proof */
export type GracePeriod = "1h" | "3h" | "6h" | "12h" | "eod";

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  frequency: GoalFrequency;
  reminderTime?: string; // HH:mm
  /** @deprecated use reminderDays; 0-6 for weekly (0 = Sunday) */
  reminderDay?: number;
  /** Which days of the week (0–6, 0=Sun) to get a reminder. Daily = all 7; weekly = selected days (can do multiple per week). */
  reminderDays?: number[];
  /** How long after due time to submit: 1h, 3h, 6h, 12h, or eod (end of day) */
  gracePeriod?: GracePeriod;
  /** Pro-only: freeze streak/growth while goal is paused */
  isOnBreak?: boolean;
  breakStartedAt?: string;
  breakStreakSnapshot?: number;
  streakCarryover?: number;
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

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    priceYearly: 0,
    dailyGoals: 1,
    weeklyGoals: 1,
    features: [
      "1 daily goal",
      "1 weekly goal",
      "AI photo verification",
      "Daily & weekly reminders",
      "Streak tracking",
      "Green theme",
      "Change goal plant style",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 5.99,
    priceYearly: 54,
    dailyGoals: 5,
    weeklyGoals: 5,
    features: [
      "5 daily goals",
      "5 weekly goals",
      "Everything in Free",
      "Goal Gallery access",
      "Custom reminder times",
      "Flexible proof grace period",
      "Change goal plant style",
      "Goal break mode (freeze streak)",
      "4 extra themes (Pink, Violet, Ocean, Teal)",
      "Best for regular goal-setters",
    ],
    stripePriceId: "price_pro_monthly",
  },
  {
    id: "premium",
    name: "Premium",
    priceMonthly: 12.99,
    priceYearly: 99,
    dailyGoals: -1,
    weeklyGoals: -1,
    features: [
      "Unlimited daily & weekly goals",
      "Everything in Pro",
      "All 10 theme colors",
      "Priority AI verification",
      "Accountability Buddy full access",
      "Best for power users & accountability",
    ],
    stripePriceId: "price_premium_monthly",
  },
];
