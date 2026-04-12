import { normalizePlanId, type PlanId } from "@/types";

const SESSION_KEY = "proveit_post_plan_welcome_plan_id";

export function setPostPlanWelcomeFlag(planId: PlanId): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_KEY, planId);
  } catch {
    // private mode / quota
  }
}

export function peekPostPlanWelcomePlanId(): PlanId | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return normalizePlanId(raw);
  } catch {
    return null;
  }
}

export function clearPostPlanWelcomeFlag(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}
