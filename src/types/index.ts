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
    dailyGoals: 2,
    weeklyGoals: 1,
    features: [
      "2 daily goals, 1 weekly goal",
      "Full garden (Seedling → Flowering)",
      "1 fixed plant style per goal",
      "Full AI verification (GPT-4 Vision)",
      "Basic notifications (1 reminder per goal, customizable time)",
      "Full plant growth & streak tracking",
      "Basic dashboard & watering progress",
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
      "5 daily goals, 5 weekly goals",
      "4 plant styles, 4 color themes (Pink, Violet, Ocean, Teal)",
      "AI verification with feedback",
      "Advanced reminders & custom grace periods",
      "Goal Break (freeze streak up to 3 days)",
      "Goal Gallery (history, proof photos, streaks)",
      "Priority customer support",
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
      "All 10 plant styles & 10 color themes",
      "Custom AI verification (faster, personalized feedback)",
      "Unlimited reminder scheduling",
      "Goal Break for any duration",
      "Exclusive achievements & rewards",
      "Unlimited Goal Gallery with advanced filtering",
      "Priority & dedicated support",
    ],
    stripePriceId: "price_premium_monthly",
  },
];
