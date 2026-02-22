export type PlanId = "free" | "pro";

export function normalizePlanId(plan: unknown): PlanId {
  return plan === "pro" || plan === "premium" ? "pro" : "free";
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
  reminderDay?: number; // 0-6 for weekly (0 = Sunday)
  /** How long after due time to submit: 1h, 3h, 6h, 12h, or eod (end of day) */
  gracePeriod?: GracePeriod;
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
    weeklyGoals: 2,
    features: [
      "2 daily goals",
      "2 weekly goals",
      "AI photo verification",
      "Daily & weekly reminders",
      "Streak tracking",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 4.99,
    priceYearly: 49,
    dailyGoals: -1,
    weeklyGoals: -1,
    features: [
      "Unlimited daily goals",
      "Unlimited weekly goals",
      "AI photo verification",
      "Goal Gallery page access",
      "Gallery display controls",
      "Hide goals from gallery",
      "Custom reminder times",
      "Flexible proof grace period",
      "Change goal plant style after creation",
      "Pink, violet, and ocean color themes",
      "No plan cap when adding goals",
      "Best for larger goal routines",
    ],
    stripePriceId: "price_pro_monthly",
  },
];
