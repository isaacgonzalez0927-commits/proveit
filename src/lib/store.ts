"use client";

import {
  type Goal,
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
  name?: string;
  /** Lowercase sign-in handle when using username auth. */
  username?: string;
  /** Optional real email for password reset and notices (profiles.contact_email). */
  contactEmail?: string;
  /** ISO end time for active Premium trial (Supabase + local demo). */
  premiumTrialEndsAt?: string | null;
  /** True after the one-time Premium trial was started (never reset). */
  premiumTrialUsed?: boolean;
  /** Plan to restore when a Premium trial expires. */
  premiumTrialRevertPlan?: "free" | "pro";
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
      premiumTrialEndsAt:
        typeof parsed.premiumTrialEndsAt === "string" ? parsed.premiumTrialEndsAt : undefined,
      premiumTrialUsed: parsed.premiumTrialUsed === true,
      premiumTrialRevertPlan:
        parsed.premiumTrialRevertPlan === "pro"
          ? "pro"
          : parsed.premiumTrialRevertPlan === "free"
            ? "free"
            : undefined,
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

export function getGoalsLimit(planId: PlanId): number {
  const plan = getPlan(planId);
  return plan.maxGoals === -1 ? 999 : plan.maxGoals;
}

export function canAddGoal(planId: PlanId, currentTotalCount: number): boolean {
  return currentTotalCount < getGoalsLimit(planId);
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

export function clearStoredPlanSelection(userId: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(getPlanSelectionKey(userId));
}

/** Last known goals/submissions for the signed-in Supabase user (survives app kill / offline). */
const SB_SESSION_SNAPSHOT_KEY = "proveit_sb_session_snapshot_v1";

export type SbSessionSnapshotV1 = {
  v: 1;
  userId: string;
  goals: Goal[];
  submissions: ProofSubmission[];
};

function unionSortedDateStrings(a: string[] | undefined, b: string[] | undefined): string[] {
  const set = new Set<string>();
  for (const d of a ?? []) {
    if (typeof d === "string" && d.length > 0) set.add(d);
  }
  for (const d of b ?? []) {
    if (typeof d === "string" && d.length > 0) set.add(d);
  }
  return [...set].sort();
}

/**
 * After a cold start, /api/goals may briefly return [] or fail (cookies, WebView) while localStorage
 * still has the last good snapshot. Keep goals that exist only in the snapshot so they are not wiped.
 * For goals present on both sides, union `completedDates` so a stale GET (e.g. before PATCH lands)
 * does not drop today's completion that the client and snapshot already have.
 */
export function mergeServerGoalsWithSessionSnapshot(
  serverGoals: Goal[],
  snap: SbSessionSnapshotV1 | null,
  userId: string
): Goal[] {
  if (!snap || snap.userId !== userId) return serverGoals;
  const snapById = new Map(snap.goals.map((g) => [g.id, g]));
  const mergedCore = serverGoals.map((serverG) => {
    const local = snapById.get(serverG.id);
    if (!local) return serverG;
    const mergedDates = unionSortedDateStrings(serverG.completedDates, local.completedDates);
    const prevLen = serverG.completedDates?.length ?? 0;
    if (mergedDates.length === prevLen && mergedDates.every((d, i) => d === serverG.completedDates?.[i])) {
      return serverG;
    }
    return { ...serverG, completedDates: mergedDates };
  });
  const serverIds = new Set(mergedCore.map((g) => g.id));
  const extras = snap.goals.filter(
    (g) => g && typeof g.id === "string" && g.id.length > 0 && !serverIds.has(g.id)
  );
  return extras.length === 0 ? mergedCore : [...mergedCore, ...extras];
}

export function mergeServerSubmissionsWithSessionSnapshot(
  serverSubs: ProofSubmission[],
  snap: SbSessionSnapshotV1 | null,
  userId: string
): ProofSubmission[] {
  if (!snap || snap.userId !== userId) return serverSubs;
  const ids = new Set(serverSubs.map((s) => s.id));
  const extras = snap.submissions.filter(
    (s) => s && typeof s.id === "string" && s.id.length > 0 && !ids.has(s.id)
  );
  return extras.length === 0 ? serverSubs : [...serverSubs, ...extras];
}

export function readSbSessionSnapshot(): SbSessionSnapshotV1 | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SB_SESSION_SNAPSHOT_KEY);
  if (!raw) return null;
  try {
    const x = JSON.parse(raw) as Partial<SbSessionSnapshotV1>;
    if (x.v !== 1 || typeof x.userId !== "string" || !Array.isArray(x.goals)) return null;
    return {
      v: 1,
      userId: x.userId,
      goals: x.goals as Goal[],
      submissions: Array.isArray(x.submissions) ? (x.submissions as ProofSubmission[]) : [],
    };
  } catch {
    return null;
  }
}

export function writeSbSessionSnapshot(
  userId: string,
  goals: Goal[],
  submissions: ProofSubmission[]
) {
  if (typeof window === "undefined") return;
  try {
    const payload: SbSessionSnapshotV1 = { v: 1, userId, goals, submissions };
    localStorage.setItem(SB_SESSION_SNAPSHOT_KEY, JSON.stringify(payload));
  } catch {
    // quota / private mode
  }
}

export function clearSbSessionSnapshot() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SB_SESSION_SNAPSHOT_KEY);
  } catch {
    // ignore
  }
}

export {
  getStoredUser,
  getStoredGoals,
  getStoredSubmissions,
  STORAGE_KEYS,
};
