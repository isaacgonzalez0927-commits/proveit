import type { Plan, PlanId } from "@/types";

export function canSelfAssignPlan(plan: PlanId, isCreator: boolean): boolean {
  if (plan === "free") return true;
  return isCreator;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function formatUsd(amount: number): string {
  if (amount === 0) return "Free";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function planPriceForBilling(plan: Plan, billing: "monthly" | "yearly"): number {
  return billing === "yearly" ? plan.priceYearly : plan.priceMonthly;
}

export function stripePriceIdForBilling(
  plan: Plan,
  billing: "monthly" | "yearly"
): string | undefined {
  return billing === "yearly" ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly;
}

export function yearlySavingsPercent(plan: Plan): number | null {
  if (plan.priceMonthly <= 0 || plan.priceYearly <= 0) return null;
  const yearlyFromMonthly = plan.priceMonthly * 12;
  if (yearlyFromMonthly <= plan.priceYearly) return null;
  return Math.round(((yearlyFromMonthly - plan.priceYearly) / yearlyFromMonthly) * 100);
}
