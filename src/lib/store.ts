"use client";

import {
  type Goal,
  type GoalFrequency,
  type PlanId,
  type ProofSubmission,
  PLANS,
  normalizePlanId,
} from "@/types";

const STORAGE_KEYS = {
  user: "proveit_user",
  goals: "proveit_goals",
  submissions: "proveit_submissions",
  planSelectedByUserPrefix: "proveit_plan_selected:",
} as const;

export interface StoredUser {
  id: string;
  email: string;
  plan: PlanId;
  planBilling?: "monthly" | "yearly";
  createdAt: string;
}

function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEYS.user);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredUser & { plan?: unknown };
    return {
      ...parsed,
      plan: normalizePlanId(parsed.plan),
    };
  } catch {
    return null;
  }
}

function getStoredGoals(): Goal[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEYS.goals);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Goal[];
  } catch {
    return [];
  }
}

function getStoredSubmissions(): ProofSubmission[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEYS.submissions);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ProofSubmission[];
  } catch {
    return [];
  }
}

export function saveUser(user: StoredUser) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    STORAGE_KEYS.user,
    JSON.stringify({
      ...user,
      plan: normalizePlanId(user.plan),
    })
  );
}

export function saveGoals(goals: Goal[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.goals, JSON.stringify(goals));
}

export function saveSubmissions(submissions: ProofSubmission[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.submissions, JSON.stringify(submissions));
}

export function getPlan(planId: PlanId) {
  return PLANS.find((p) => p.id === planId) ?? PLANS[0];
}

export function getGoalsLimit(planId: PlanId, frequency: GoalFrequency) {
  const plan = getPlan(planId);
  const limit = frequency === "daily" ? plan.dailyGoals : plan.weeklyGoals;
  return limit === -1 ? 999 : limit;
}

export function canAddGoal(planId: PlanId, frequency: GoalFrequency, currentCount: number) {
  const limit = getGoalsLimit(planId, frequency);
  return currentCount < limit;
}

export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function getPlanSelectionKey(userId: string) {
  return `${STORAGE_KEYS.planSelectedByUserPrefix}${userId}`;
}

export function hasStoredPlanSelection(userId: string) {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(getPlanSelectionKey(userId)) === "1";
}

export function markStoredPlanSelection(userId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(getPlanSelectionKey(userId), "1");
}

export {
  getStoredUser,
  getStoredGoals,
  getStoredSubmissions,
  STORAGE_KEYS,
};
