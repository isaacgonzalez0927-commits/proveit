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
  /** @deprecated use reminderDays; 0-6 for weekly (0 = Sunday) */
  reminderDay?: number;
  /** Which days of the week (0–6, 0=Sun) to get a reminder. Daily = all 7; weekly = selected days (can do multiple per week). */
  reminderDays?: number[];
  /** How long after due time to submit: 1h, 3h, 6h, 12h, or eod (end of day) */
  gracePeriod?: GracePeriod;
  /**
   * AI-generated photo prompts for this goal (typically 2–3). The user only picks
   * proofRequirement from this list (or refreshes the list from the same title).
   */
  proofSuggestions?: string[];
  /** Selected prompt; must match one entry in proofSuggestions when both are set. */
  proofRequirement?: string;
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
    maxGoals: 2,
    features: [
      "2 goals",
      "Full garden (Seedling → Flowering)",
      "3 plant styles to choose from",
      "Full AI verification (GPT-4 Vision)",
      "Daily reminders & simple weekly targets",
      "Full plant growth & streak tracking",
      "Dashboard & watering progress",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 5.99,
    priceYearly: 54,
    maxGoals: 5,
    features: [
      "5 goals",
      "6 plant styles (including strawberry)",
      "6 accent themes (Pink, Violet, Ocean, Teal, Orange, Amber + more)",
      "AI verification with feedback",
      "Goal Break (freeze streak up to 3 days)",
      "Goal Gallery (history, proof photos, streaks)",
      "Priority support",
    ],
    stripePriceId: "price_pro_monthly",
  },
  {
    id: "premium",
    name: "Premium",
    priceMonthly: 12.99,
    priceYearly: 99,
    maxGoals: -1,
    features: [
      "Unlimited goals",
      "All 8 plant styles (including cactus)",
      "All 10 accent themes",
      "Goal Break for any duration",
      "Unlimited Goal Gallery with weekly photo collages",
      "Exclusive achievements & rewards",
      "Priority & dedicated support",
    ],
    stripePriceId: "price_premium_monthly",
  },
];
