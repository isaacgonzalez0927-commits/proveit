"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  normalizePlanId,
  type Goal,
  type PlanId,
  type ProofSubmission,
  type TimesPerWeek,
} from "@/types";
import {
  getStoredUser,
  getStoredGoals,
  getStoredSubmissions,
  hasStoredPlanSelection,
  markStoredPlanSelection,
  clearStoredPlanSelection,
  saveUser,
  saveGoals,
  saveSubmissions,
  canAddGoal,
  generateId,
  readSbSessionSnapshot,
  writeSbSessionSnapshot,
  clearSbSessionSnapshot,
  mergeServerGoalsWithSessionSnapshot,
  mergeServerSubmissionsWithSessionSnapshot,
  unionSortedDateStrings,
  type StoredUser,
  STORAGE_KEYS,
} from "@/lib/store";
import { PLANS } from "@/types";
import { useSupabaseAuth } from "@/lib/supabase/hooks";
import { format } from "date-fns";
import { extractCalendarDateKey } from "@/lib/dateUtils";
import { isWithinSubmissionWindow, normalizeReminderTimeInput } from "@/lib/goalDue";
import { normalizeProBreakUsageByMonth } from "@/lib/goalBreak";
import { isValidProofBundle } from "@/lib/proofSuggestions";
import {
  getStoredEarnedItems,
  getStoredEquippedItems,
  saveEarnedItems,
  saveEquippedItems,
  computeNewlyEarnedItems,
  type EquippedItems,
} from "@/lib/buddyItems";
import {
  clampVariantForPlan,
  clearGoalPlantSelections,
  getDefaultGoalPlantVariant,
  getStoredGoalPlantSelections,
  saveGoalPlantSelections,
  type GoalPlantVariant,
} from "@/lib/goalPlants";
import { LoadingView } from "@/components/LoadingView";
import { NotificationScheduler } from "@/components/NotificationScheduler";
import { NotificationPrompt } from "@/components/NotificationPrompt";
import { ThemeSync } from "@/components/ThemeSync";
import {
  PENDING_PLAN_AFTER_TOUR_KEY,
  TOUR_DONE_KEY,
  TOUR_DONE_VERSION,
} from "@/lib/tourStorage";
import {
  canStartPremiumTrial,
  expireLocalPremiumTrialIfNeeded,
  trialEndsAtFromNow,
} from "@/lib/premiumTrial";

const SUPABASE_CONFIGURED = !!(
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

interface AppContextValue {
  user: StoredUser | null;
  goals: Goal[];
  submissions: ProofSubmission[];
  authReady: boolean;
  setUser: (user: StoredUser | null) => void;
  setPlan: (
    plan: PlanId,
    billing?: "monthly" | "yearly",
    options?: { startPremiumTrial?: boolean }
  ) => void | Promise<void>;
  addGoal: (goal: Omit<Goal, "id" | "userId" | "createdAt" | "completedDates">) => Promise<{ created: Goal | null; error?: string }>;
  updateGoal: (
    id: string,
    updates: Partial<Goal>
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  removeGoal: (id: string) => void | Promise<void>;
  addSubmission: (sub: Omit<ProofSubmission, "id" | "createdAt">) => ProofSubmission | Promise<ProofSubmission>;
  updateSubmission: (id: string, updates: Partial<ProofSubmission>) => void | Promise<void>;
  deleteGoalHistory: (goalId: string) => void | Promise<void>;
  canAddGoal: () => boolean;
  getSubmissionsForGoal: (goalId: string) => ProofSubmission[];
  markGoalDone: (goalId: string) => Promise<void>;
  earnedItems: string[];
  equippedItems: EquippedItems;
  setEquipped: (slot: keyof EquippedItems, itemId: string | null) => void;
  checkAndAwardItems: (maxStreak: number) => string[];
  goalPlantSelections: Record<string, GoalPlantVariant>;
  getGoalPlantVariant: (goalId: string) => GoalPlantVariant;
  setGoalPlantVariant: (goalId: string, variant: GoalPlantVariant) => void;
  requestNotificationPermission: () => Promise<boolean>;
  hasSelectedPlan: boolean;
  /** True when in temporary guest mode (0 goals, plan picker); restore via Settings. */
  isDevGuestMode: boolean;
  /** Dev-only: treat as new guest (empty state); then use restoreActualAccount in Settings to go back. */
  clearPlanSelectionForNewUser: () => void;
  /** Dev-only: leave guest mode and reload with real account data. */
  restoreActualAccount: () => void;
  signOut: () => void | Promise<void>;
  useSupabase: boolean;
  supabase: import("@supabase/supabase-js").SupabaseClient | null;
}

const AppContext = createContext<AppContextValue | null>(null);

function useSupabaseConfigured() {
  return SUPABASE_CONFIGURED;
}

function mapGoalFromApi(g: Record<string, unknown>): Goal {
  const freq: Goal["frequency"] = g.frequency === "weekly" ? "weekly" : "daily";
  let tw = g.timesPerWeek;
  if (typeof tw !== "number" || tw < 1 || tw > 7) {
    tw = freq === "daily" ? 7 : 1;
  }
  const rt = normalizeReminderTimeInput(typeof g.reminderTime === "string" ? g.reminderTime : null);
  return {
    id: g.id as string,
    userId: g.userId as string,
    title: g.title as string,
    description: typeof g.description === "string" ? g.description : undefined,
    frequency: freq,
    timesPerWeek: tw as TimesPerWeek,
    reminderTime: rt || undefined,
    reminderDay: typeof g.reminderDay === "number" ? g.reminderDay : undefined,
    reminderDays: Array.isArray(g.reminderDays) ? (g.reminderDays as number[]) : undefined,
    gracePeriod: g.gracePeriod as Goal["gracePeriod"] | undefined,
    isOnBreak: g.isOnBreak === true,
    breakStartedAt: typeof g.breakStartedAt === "string" ? g.breakStartedAt : undefined,
    breakStreakSnapshot:
      typeof g.breakStreakSnapshot === "number" ? g.breakStreakSnapshot : undefined,
    streakCarryover: typeof g.streakCarryover === "number" ? g.streakCarryover : undefined,
    proBreakUsageByMonth: normalizeProBreakUsageByMonth(g.proBreakUsageByMonth),
    createdAt: g.createdAt as string,
    completedDates: Array.isArray(g.completedDates) ? (g.completedDates as string[]) : [],
    proofSuggestions: Array.isArray(g.proofSuggestions)
      ? (g.proofSuggestions as unknown[]).filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      : undefined,
    proofRequirement:
      typeof g.proofRequirement === "string" && g.proofRequirement.trim()
        ? (g.proofRequirement as string).trim()
        : undefined,
  };
}

type ApiProfileLike = {
  id?: string;
  email?: string;
  plan?: unknown;
  planBilling?: "monthly" | "yearly";
  createdAt?: string;
  name?: string;
  username?: string;
  contactEmail?: string;
  premiumTrialEndsAt?: string | null;
  premiumTrialUsed?: boolean;
};

/**
 * Tracks which Supabase user we already ran the initial `setDataLoaded(false)` bootstrap for.
 * Must survive `AppProvider` remounts (React Strict Mode, layout remounts) and match on **user id**
 * only — `supabaseUser` object identity changes on `TOKEN_REFRESHED`, which was flipping `dataLoaded`
 * off and blocking the whole app with the loading overlay during long tasks (e.g. local CLIP verify).
 */
let lastSupabaseBootstrapUserId: string | null = null;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const useSupabase = useSupabaseConfigured();
  const { user: supabaseUser, loading: authLoading, supabase } = useSupabaseAuth();
  const [user, setUserState] = useState<StoredUser | null>(null);
  const [goals, setGoalsState] = useState<Goal[]>([]);
  const [submissions, setSubmissionsState] = useState<ProofSubmission[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [earnedItems, setEarnedItems] = useState<string[]>([]);
  const [equippedItems, setEquippedItemsState] = useState<EquippedItems>({});
  const [goalPlantSelections, setGoalPlantSelections] = useState<Record<string, GoalPlantVariant>>({});
  const [hasSelectedPlan, setHasSelectedPlan] = useState(false);
  const [isDevGuestMode, setIsDevGuestMode] = useState(false);
  /** Avoid toggling dataLoaded off on every auth effect re-run — that unmounted the whole app and reset in-flow UIs (e.g. proof submit). */
  const supabaseBootstrapUidRef = useRef<string | null>(null);
  /** Each new Supabase bootstrap run supersedes older in-flight `.then` handlers (effect re-runs, Strict Mode). */
  const bootstrapApplySeqRef = useRef(0);
  /** Bumped before client-driven profile writes so a stale `/api/profile` GET from an older bootstrap cannot overwrite. */
  const profileClientEpochRef = useRef(0);
  /** Latest goals/submissions for synchronous session snapshot writes (avoid races with async bootstrap merge). */
  const goalsRef = useRef(goals);
  const submissionsRef = useRef(submissions);
  goalsRef.current = goals;
  submissionsRef.current = submissions;

  useEffect(() => {
    if (useSupabase && supabase && supabaseUser) {
      const uid = supabaseUser.id;
      const alreadyBootstrapped = lastSupabaseBootstrapUserId === uid;
      supabaseBootstrapUidRef.current = uid;
      const snap = readSbSessionSnapshot();
      // Only hydrate from snapshot on first bootstrap for this user — re-applying on every effect
      // run can overwrite fresher in-memory state before the fetch merge completes.
      if (!alreadyBootstrapped && snap?.userId === uid) {
        setGoalsState(snap.goals);
        setSubmissionsState(snap.submissions);
      }
      if (!alreadyBootstrapped) {
        setDataLoaded(false);
        lastSupabaseBootstrapUserId = uid;
      }
      const bootstrapApplySeq = ++bootstrapApplySeqRef.current;
      const profileEpochAtBootstrapStart = profileClientEpochRef.current;
      Promise.allSettled([
        fetch("/api/profile", { credentials: "same-origin" }).then(async (r) => ({
          ok: r.ok,
          body: await r.json().catch(() => ({})),
        })),
        fetch("/api/goals", { credentials: "same-origin" }).then(async (r) => ({
          ok: r.ok,
          body: await r.json().catch(() => ({})),
        })),
        fetch("/api/submissions", { credentials: "same-origin" }).then(async (r) => ({
          ok: r.ok,
          body: await r.json().catch(() => ({})),
        })),
      ]).then(([profileResult, goalsResult, subsResult]) => {
        const profileWrap = profileResult.status === "fulfilled" ? profileResult.value : null;
        type ApiProfile = {
          id: string;
          email?: string;
          plan?: unknown;
          planBilling?: "monthly" | "yearly";
          createdAt?: string;
          name?: string;
          username?: unknown;
          contactEmail?: unknown;
          premiumTrialEndsAt?: string | null;
          premiumTrialUsed?: boolean;
        };
        const profileRaw =
          profileWrap?.ok && profileWrap.body && typeof profileWrap.body === "object"
            ? (profileWrap.body as { profile?: unknown }).profile
            : null;
        const p: ApiProfile | null =
          profileRaw &&
          typeof profileRaw === "object" &&
          profileRaw !== null &&
          typeof (profileRaw as { id?: unknown }).id === "string"
            ? (profileRaw as ApiProfile)
            : null;
        const storedName =
          typeof window !== "undefined"
            ? window.localStorage.getItem("proveit_display_name") ?? undefined
            : undefined;
        const profileUser = p
          ? {
              id: p.id,
              email: p.email ?? "",
              plan: normalizePlanId(p.plan),
              planBilling: p.planBilling,
              createdAt: p.createdAt ?? new Date().toISOString(),
              name: p.name ?? storedName,
              username: typeof p.username === "string" ? p.username : undefined,
              contactEmail: typeof p.contactEmail === "string" ? p.contactEmail : undefined,
              premiumTrialEndsAt:
                typeof p.premiumTrialEndsAt === "string"
                  ? p.premiumTrialEndsAt
                  : p.premiumTrialEndsAt === null
                    ? null
                    : undefined,
              premiumTrialUsed: p.premiumTrialUsed === true,
            }
          : {
              id: supabaseUser.id,
              email: supabaseUser.email ?? "",
              plan: "free" as const,
              planBilling: undefined as undefined,
              createdAt: supabaseUser.created_at,
              name: storedName,
              username: undefined as string | undefined,
              contactEmail: undefined as string | undefined,
              premiumTrialEndsAt: undefined,
              premiumTrialUsed: false,
            };
        const profileApplyStale =
          bootstrapApplySeq !== bootstrapApplySeqRef.current ||
          profileClientEpochRef.current !== profileEpochAtBootstrapStart;
        setUserState((prev) => {
          if (profileApplyStale) return prev ?? profileUser;
          return profileUser;
        });

        const goalsWrap = goalsResult.status === "fulfilled" ? goalsResult.value : null;
        const goalsBody =
          goalsWrap?.ok === true && goalsWrap.body && typeof goalsWrap.body === "object"
            ? (goalsWrap.body as { goals?: unknown })
            : {};
        const gs = Array.isArray(goalsBody.goals) ? goalsBody.goals : [];
        const mappedServerGoals = gs.map((g: Record<string, unknown>) => mapGoalFromApi(g));
        setGoalsState((prevGoals) => {
          const snapForMerge = readSbSessionSnapshot();
          const snapMerge = snapForMerge?.userId === uid ? snapForMerge : null;
          const mergedGoalsCore = mergeServerGoalsWithSessionSnapshot(
            mappedServerGoals,
            snapMerge,
            supabaseUser.id
          );
          const byId = new Map(mergedGoalsCore.map((g) => [g.id, g]));
          for (const g of prevGoals) {
            const cur = byId.get(g.id);
            if (!cur) {
              byId.set(g.id, g);
              continue;
            }
            const mergedDates = unionSortedDateStrings(cur.completedDates, g.completedDates);
            const prevLen = cur.completedDates?.length ?? 0;
            if (
              mergedDates.length !== prevLen ||
              !mergedDates.every((d: string, i: number) => d === cur.completedDates?.[i])
            ) {
              byId.set(g.id, { ...cur, completedDates: mergedDates });
            }
          }
          const mergedIds = new Set(mergedGoalsCore.map((g) => g.id));
          const extras = [...byId.entries()]
            .filter(([id]) => !mergedIds.has(id))
            .map(([, g]) => g);
          return extras.length === 0
            ? mergedGoalsCore.map((g) => byId.get(g.id) ?? g)
            : [...mergedGoalsCore.map((g) => byId.get(g.id) ?? g), ...extras];
        });

        const subsWrap = subsResult.status === "fulfilled" ? subsResult.value : null;
        const subsBody =
          subsWrap?.ok === true && subsWrap.body && typeof subsWrap.body === "object"
            ? (subsWrap.body as { submissions?: unknown })
            : {};
        const subsRaw = Array.isArray(subsBody.submissions) ? subsBody.submissions : [];
        const mappedSubs = subsRaw.map((s: Record<string, unknown>) => {
          const rawDate = typeof s.date === "string" ? s.date : String(s.date ?? "");
          return {
          id: s.id as string,
          goalId: s.goalId as string,
          date: extractCalendarDateKey(rawDate) ?? rawDate,
          imageDataUrl: s.imageDataUrl as string,
          status: s.status as ProofSubmission["status"],
          aiFeedback: s.aiFeedback as string | undefined,
          verifiedAt: s.verifiedAt as string | undefined,
          createdAt: s.createdAt as string,
        };
        });
        setSubmissionsState((prevSubs) => {
          const snapForMergeSubs = readSbSessionSnapshot();
          const snapMergeSubs =
            snapForMergeSubs?.userId === uid ? snapForMergeSubs : null;
          const mergedSubsCore = mergeServerSubmissionsWithSessionSnapshot(
            mappedSubs,
            snapMergeSubs,
            supabaseUser.id
          );
          const byId = new Map(mergedSubsCore.map((s) => [s.id, s]));
          for (const s of prevSubs) {
            if (s && typeof s.id === "string" && s.id.length > 0 && !byId.has(s.id)) {
              byId.set(s.id, s);
            }
          }
          return [...byId.values()];
        });

        // Set hasSelectedPlan and goalPlantSelections in the same tick so no flash of wrong plant variants
        setGoalPlantSelections(getStoredGoalPlantSelections());
        // A signed-in Supabase user is NOT a guest. Clear any stale guest flag
        // left over from previous "Try as guest" sessions; otherwise the next
        // bootstrap would wipe real goals/submissions to [].
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("proveit_dev_guest_mode");
        }
        setIsDevGuestMode(false);
        const selectedOnThisDevice = hasStoredPlanSelection(profileUser.id);
        const selectedByAccount = profileUser.plan !== "free";
        const likelyExistingFreeUser =
          mappedServerGoals.length > 0 || mappedSubs.length > 0;
        setHasSelectedPlan(selectedOnThisDevice || selectedByAccount || likelyExistingFreeUser);
      }).finally(() => setDataLoaded(true));
      setHydrated(true);
      return;
    }
    // Only treat as signed-out once the client exists and auth finished resolving — avoids
    // clearing goals during the brief window before getSession() completes.
    if (useSupabase && supabase && !authLoading && !supabaseUser) {
      supabaseBootstrapUidRef.current = null;
      lastSupabaseBootstrapUserId = null;
      clearSbSessionSnapshot();
      setUserState(null);
      setGoalsState([]);
      setSubmissionsState([]);
      setDataLoaded(true);
      setHydrated(true);
      return;
    }
    if (!useSupabase) {
      const raw = getStoredUser();
      setUserState(raw ? expireLocalPremiumTrialIfNeeded(raw) : null);
      // Restore locally stored plant style selections for demo / no-Supabase mode
      setGoalPlantSelections(getStoredGoalPlantSelections());
      const devGuestMode =
        typeof window !== "undefined" && window.localStorage.getItem("proveit_dev_guest_mode");
      if (devGuestMode) {
        setGoalsState([]);
        setSubmissionsState([]);
        setHasSelectedPlan(false);
        setIsDevGuestMode(true);
        setGoalPlantSelections({});
      } else {
        setGoalsState(getStoredGoals());
        setSubmissionsState(getStoredSubmissions());
        setIsDevGuestMode(false);
      }
      setDataLoaded(true);
      setHydrated(true);
      return;
    }
    if (useSupabase && authLoading) {
      setHydrated(true);
    }
    // Intentionally omit `supabaseUser` — only `supabaseUser?.id` — so TOKEN_REFRESHED (new object, same id)
    // does not re-run this effect and hammer /api + `dataLoaded`.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable identity is `supabaseUser.id` for bootstrap
  }, [useSupabase, supabaseUser?.id, authLoading, supabase]);

  useEffect(() => {
    if (!useSupabase || !user?.id || !dataLoaded) return;
    writeSbSessionSnapshot(user.id, goals, submissions);
  }, [useSupabase, user?.id, goals, submissions, dataLoaded]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setEarnedItems(getStoredEarnedItems());
    setEquippedItemsState(getStoredEquippedItems());
    setGoalPlantSelections(getStoredGoalPlantSelections());
  }, []);

  useEffect(() => {
    if (!hydrated || useSupabase) return;
    if (user) saveUser(user);
  }, [user, hydrated, useSupabase]);

  useEffect(() => {
    if (!hydrated || useSupabase) return;
    saveGoals(goals);
  }, [goals, hydrated, useSupabase]);

  useEffect(() => {
    if (!hydrated || useSupabase) return;
    saveSubmissions(submissions);
  }, [submissions, hydrated, useSupabase]);

  useEffect(() => {
    if (!user) {
      setHasSelectedPlan(false);
      return;
    }
    const selectedOnThisDevice = hasStoredPlanSelection(user.id);
    const selectedByAccount = user.plan !== "free";
    const likelyExistingFreeUser = goals.length > 0 || submissions.length > 0;
    const pendingPlanAfterTour =
      typeof window !== "undefined" &&
      window.localStorage.getItem(PENDING_PLAN_AFTER_TOUR_KEY) === user.id;
    const tourDone =
      typeof window !== "undefined" &&
      window.localStorage.getItem(TOUR_DONE_KEY) === TOUR_DONE_VERSION;
    const allowPrePlanAccess = Boolean(pendingPlanAfterTour && !tourDone);
    setHasSelectedPlan(
      selectedOnThisDevice || selectedByAccount || likelyExistingFreeUser || allowPrePlanAccess
    );
  }, [user, goals.length, submissions.length]);

  const setUser = useCallback((u: StoredUser | null) => {
    if (!u) {
      setUserState(null);
      return;
    }
    if (useSupabase) {
      profileClientEpochRef.current += 1;
    }
    setUserState({
      ...u,
      plan: normalizePlanId(u.plan),
    });
  }, [useSupabase]);

  const setPlan = useCallback(
    async (
      plan: PlanId,
      billing: "monthly" | "yearly" = "monthly",
      options?: { startPremiumTrial?: boolean }
    ) => {
      if (!user) return;
      const startTrial =
        plan === "premium" &&
        options?.startPremiumTrial === true &&
        canStartPremiumTrial(user);

      const buildLocalNext = (): StoredUser => {
        if (startTrial) {
          return {
            ...user,
            plan: "premium",
            planBilling: billing,
            premiumTrialEndsAt: trialEndsAtFromNow(),
            premiumTrialUsed: true,
            premiumTrialRevertPlan: user.plan === "pro" ? "pro" : "free",
          };
        }
        const next: StoredUser = {
          ...user,
          plan,
          planBilling: plan === "free" ? undefined : billing,
        };
        if (plan === "free" || plan === "pro") {
          next.premiumTrialEndsAt = undefined;
          next.premiumTrialRevertPlan = undefined;
        } else if (plan === "premium" && user.plan !== "premium") {
          next.premiumTrialEndsAt = undefined;
          next.premiumTrialRevertPlan = undefined;
        }
        return next;
      };

      if (useSupabase) {
        try {
          const res = await fetch("/api/profile", {
            method: "PATCH",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              startTrial
                ? { startPremiumTrial: true, planBilling: billing }
                : { plan, planBilling: billing }
            ),
          });
          const data = (await res.json().catch(() => ({}))) as {
            profile?: ApiProfileLike;
            error?: string;
          };

          const applyFromApiProfile = (pr: ApiProfileLike) => {
            profileClientEpochRef.current += 1;
            setUserState({
              id: pr.id ?? user.id,
              email: pr.email ?? user.email,
              plan: normalizePlanId(pr.plan),
              planBilling: pr.plan === "free" ? undefined : pr.planBilling ?? billing,
              createdAt: pr.createdAt ?? user.createdAt,
              name: pr.name ?? user.name,
              username: typeof pr.username === "string" ? pr.username : user.username,
              contactEmail:
                typeof pr.contactEmail === "string" ? pr.contactEmail : user.contactEmail,
              premiumTrialEndsAt:
                typeof pr.premiumTrialEndsAt === "string"
                  ? pr.premiumTrialEndsAt
                  : pr.premiumTrialEndsAt === null
                    ? null
                    : undefined,
              premiumTrialUsed: pr.premiumTrialUsed === true,
            });
            markStoredPlanSelection(user.id);
            if (typeof window !== "undefined") {
              window.localStorage.removeItem(PENDING_PLAN_AFTER_TOUR_KEY);
            }
            setHasSelectedPlan(true);
          };

          if (data.profile && typeof data.profile === "object") {
            applyFromApiProfile(data.profile);
            return;
          }

          if (res.ok) {
            const r2 = await fetch("/api/profile", { credentials: "same-origin" });
            const j2 = (await r2.json().catch(() => ({}))) as { profile?: ApiProfileLike };
            if (j2.profile && typeof j2.profile === "object") {
              applyFromApiProfile(j2.profile);
              return;
            }
          }

          if (!res.ok) {
            console.error("setPlan: PATCH /api/profile failed", res.status, data?.error);
            const r3 = await fetch("/api/profile", { credentials: "same-origin" });
            const j3 = (await r3.json().catch(() => ({}))) as { profile?: ApiProfileLike };
            if (j3.profile && typeof j3.profile === "object") {
              applyFromApiProfile(j3.profile);
              return;
            }
            return;
          }
        } catch (e) {
          console.warn("setPlan: network error, applying plan locally", e);
        }
      }

      profileClientEpochRef.current += 1;
      setUserState(buildLocalNext());
      markStoredPlanSelection(user.id);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(PENDING_PLAN_AFTER_TOUR_KEY);
      }
      setHasSelectedPlan(true);
    },
    [user, useSupabase]
  );

  const clearPlanSelectionForNewUser = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("proveit_dev_guest_mode", "1");
      window.localStorage.removeItem("proveit_intro_seen");
    }
    if (user?.id) {
      clearStoredPlanSelection(user.id);
    }
    setGoalsState([]);
    setSubmissionsState([]);
    setHasSelectedPlan(false);
    setIsDevGuestMode(true);
    setGoalPlantSelections({});
    if (typeof window !== "undefined") {
      clearGoalPlantSelections();
    }
  }, [user?.id]);

  const restoreActualAccount = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("proveit_dev_guest_mode");
    }
    window.location.reload();
  }, []);

  const addGoal = useCallback(
    async (input: Omit<Goal, "id" | "userId" | "createdAt" | "completedDates">): Promise<{ created: Goal | null; error?: string }> => {
      const uid = user?.id ?? "anonymous";
      if (!canAddGoal(user?.plan ?? "free", goals.length)) {
        return { created: null, error: "Goal limit reached for your plan. Upgrade to add more goals." };
      }
      const id = generateId();
      const goal: Goal = {
        ...input,
        id,
        userId: uid,
        createdAt: new Date().toISOString(),
        completedDates: [],
      };
      if (!isValidProofBundle(goal.proofSuggestions, goal.proofRequirement)) {
        return {
          created: null,
          error: "Add a clear goal title, then try again — your proof photo should match that goal.",
        };
      }
      if (useSupabase) {
        try {
          const res = await fetch("/api/goals", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id,
              title: goal.title,
              description: goal.description,
              frequency: goal.frequency,
              timesPerWeek: goal.timesPerWeek ?? (goal.frequency === "daily" ? 7 : 1),
              reminderTime: goal.reminderTime,
              reminderDay: goal.reminderDay,
              reminderDays: goal.reminderDays,
              proofSuggestions: goal.proofSuggestions,
              proofRequirement: goal.proofRequirement,
            }),
          });
          let data: { goal?: Goal; error?: string; message?: string } = {};
          try {
            data = await res.json();
          } catch {
            // non-JSON response (e.g. 502 HTML)
            const msg = res.ok ? "Invalid response from server" : `Server error (${res.status})`;
            return { created: null, error: msg };
          }
          if (!res.ok) {
            const serverErr =
              typeof data?.error === "string" && data.error.trim()
                ? data.error.trim()
                : typeof data?.message === "string" && data.message.trim()
                  ? data.message.trim()
                  : null;
            const msg =
              serverErr ??
              (res.status === 401
                ? "Please sign in again."
                : res.status === 503
                  ? "Server is not configured or the database needs an update. Try again later."
                  : res.statusText || `Error ${res.status}`);
            console.error("Failed to create goal:", msg);
            return { created: null, error: msg };
          }
          const rawGoal = data?.goal as Record<string, unknown> | undefined;
          if (!rawGoal || typeof rawGoal.id !== "string") {
            return { created: null, error: "Server did not return the new goal. Try again." };
          }
          const created = mapGoalFromApi(rawGoal);
          setGoalsState((prev) => [...prev, created]);
          return { created, error: undefined };
        } catch (error) {
          const msg =
            error instanceof Error
              ? (error.message || "Network error. Check your connection.")
              : "Network error. Check your connection.";
          console.error("Failed to create goal:", error);
          return { created: null, error: msg };
        }
      }
      setGoalsState((prev) => [...prev, goal]);
      return { created: goal, error: undefined };
    },
    [user, goals, useSupabase]
  );

  const updateGoal = useCallback(
    async (
      id: string,
      updates: Partial<Goal>
    ): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (useSupabase) {
        try {
          const res = await fetch("/api/goals", {
            method: "PATCH",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id,
              ...updates,
              reminderTime: updates.reminderTime,
              reminderDay: updates.reminderDay,
              reminderDays: updates.reminderDays,
            }),
          });
          if (!res.ok) {
            let err = `Could not save (HTTP ${res.status}).`;
            try {
              const j = (await res.json()) as { error?: unknown };
              if (typeof j.error === "string" && j.error.trim()) err = j.error.trim();
            } catch {
              /* ignore */
            }
            return { ok: false, error: err };
          }
        } catch (e) {
          // Offline / network: keep previous optimistic local behavior
          console.warn("updateGoal: network error, applying change locally", e);
        }
      }
      setGoalsState((prev) =>
        prev.map((g) => (g.id === id ? { ...g, ...updates } : g))
      );
      return { ok: true };
    },
    [useSupabase]
  );

  const removeGoal = useCallback(
    async (id: string) => {
      if (useSupabase) {
        try {
          await fetch(`/api/goals?id=${encodeURIComponent(id)}`, {
            method: "DELETE",
            credentials: "same-origin",
          });
        } catch {
          // fallback to local
        }
      }
      setGoalsState((prev) => prev.filter((g) => g.id !== id));
      setSubmissionsState((prev) => prev.filter((s) => s.goalId !== id));
      setGoalPlantSelections((prev) => {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        saveGoalPlantSelections(next);
        return next;
      });
    },
    [useSupabase]
  );

  const addSubmission = useCallback(
    async (input: Omit<ProofSubmission, "id" | "createdAt">) => {
      const id = generateId();
      const sub: ProofSubmission = {
        ...input,
        id,
        createdAt: new Date().toISOString(),
      };
      if (useSupabase) {
        try {
          const res = await fetch("/api/submissions", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id,
              goalId: sub.goalId,
              date: sub.date,
              imageDataUrl: sub.imageDataUrl,
              status: sub.status,
              aiFeedback: sub.aiFeedback,
              verifiedAt: sub.verifiedAt,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            const next = [...submissionsRef.current, sub];
            if (user?.id) writeSbSessionSnapshot(user.id, goalsRef.current, next);
            setSubmissionsState(next);
            return sub;
          }
          const created = (data.submission ?? sub) as ProofSubmission;
          const next = submissionsRef.current.some((s) => s.id === created.id)
            ? submissionsRef.current.map((s) => (s.id === created.id ? created : s))
            : [...submissionsRef.current, created];
          if (user?.id) writeSbSessionSnapshot(user.id, goalsRef.current, next);
          setSubmissionsState(next);
          return created;
        } catch {
          // fallback to local
        }
      }
      const nextLocal = [...submissionsRef.current, sub];
      if (useSupabase && user?.id) writeSbSessionSnapshot(user.id, goalsRef.current, nextLocal);
      setSubmissionsState(nextLocal);
      return sub;
    },
    [useSupabase, user?.id]
  );

  const updateSubmission = useCallback(
    async (id: string, updates: Partial<ProofSubmission>) => {
      if (useSupabase) {
        try {
          await fetch("/api/submissions", {
            method: "PATCH",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...updates }),
          });
        } catch {
          // fallback to local
        }
      }
      setSubmissionsState((prev) => {
        const next = prev.map((s) => (s.id === id ? { ...s, ...updates } : s));
        if (useSupabase && user?.id) writeSbSessionSnapshot(user.id, goalsRef.current, next);
        return next;
      });
    },
    [useSupabase, user?.id]
  );

  const deleteGoalHistory = useCallback(
    async (goalId: string) => {
      if (useSupabase) {
        try {
          await fetch(`/api/submissions?goalId=${encodeURIComponent(goalId)}`, {
            method: "DELETE",
            credentials: "same-origin",
          });
        } catch {
          // fallback to local
        }
        try {
          await fetch("/api/goals", {
            method: "PATCH",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: goalId, completedDates: [] }),
          });
        } catch {
          // fallback to local
        }
      }
      setSubmissionsState((prev) => prev.filter((s) => s.goalId !== goalId));
      setGoalsState((prev) =>
        prev.map((g) => (g.id === goalId ? { ...g, completedDates: [] } : g))
      );
    },
    [useSupabase]
  );

  const canAddGoalCheck = useCallback(
    () => canAddGoal(user?.plan ?? "free", goals.length),
    [user, goals]
  );

  const getSubmissionsForGoal = useCallback(
    (goalId: string) => submissions.filter((s) => s.goalId === goalId),
    [submissions]
  );

  const markGoalDone = useCallback(
    async (goalId: string) => {
      const g = goals.find((x) => x.id === goalId);
      if (!g) return;
      const subsForGoal = getSubmissionsForGoal(goalId);
      if (!isWithinSubmissionWindow(g, new Date(), subsForGoal)) return;
      const dateStr = format(new Date(), "yyyy-MM-dd");
      const existing = submissions.find(
        (s) => s.goalId === goalId && extractCalendarDateKey(s.date) === dateStr
      );
      if (existing?.status === "verified") return;
      await addSubmission({
        goalId,
        date: dateStr,
        imageDataUrl: "",
        status: "verified",
        aiFeedback: "Marked as done.",
        verifiedAt: new Date().toISOString(),
      });
      if (!g.completedDates.includes(dateStr)) {
        const saved = await updateGoal(goalId, { completedDates: [...g.completedDates, dateStr] });
        if (!saved.ok) console.error("markGoalDone: goal PATCH failed", saved.error);
      }
    },
    [goals, submissions, addSubmission, updateGoal, getSubmissionsForGoal]
  );

  const setEquipped = useCallback((slot: keyof EquippedItems, itemId: string | null) => {
    setEquippedItemsState((prev) => {
      const next = { ...prev };
      if (itemId) next[slot] = itemId;
      else delete next[slot];
      saveEquippedItems(next);
      return next;
    });
  }, []);

  const checkAndAwardItems = useCallback(
    (maxStreak: number): string[] => {
      const totalGoalsCompleted = submissions.filter((s) => s.status === "verified").length;
      const hasCompletedAnyGoal = totalGoalsCompleted > 0;
      const newlyEarned = computeNewlyEarnedItems(earnedItems, {
        hasCompletedAnyGoal,
        maxStreak,
        totalGoalsCompleted,
      });
      if (newlyEarned.length > 0) {
        const next = [...earnedItems, ...newlyEarned];
        setEarnedItems(next);
        saveEarnedItems(next);
      }
      return newlyEarned;
    },
    [earnedItems, submissions]
  );

  const requestNotificationPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const result = await Notification.requestPermission();
    return result === "granted";
  }, []);

  const setGoalPlantVariant = useCallback((goalId: string, variant: GoalPlantVariant) => {
    setGoalPlantSelections((prev) => {
      const next = { ...prev, [goalId]: variant };
      saveGoalPlantSelections(next);
      return next;
    });
  }, []);

  const getGoalPlantVariant = useCallback(
    (goalId: string): GoalPlantVariant => {
      const raw = goalPlantSelections[goalId] ?? getDefaultGoalPlantVariant(goalId);
      return clampVariantForPlan(raw, user?.plan ?? "free");
    },
    [goalPlantSelections, user?.plan]
  );

  const signOut = useCallback(() => {
    setUserState(null);
    setGoalsState([]);
    setSubmissionsState([]);
    setHasSelectedPlan(false);
    setEarnedItems([]);
    setEquippedItemsState({});
    setGoalPlantSelections({});
    if (typeof window !== "undefined") {
      try {
        clearSbSessionSnapshot();
        localStorage.removeItem(STORAGE_KEYS.user);
        localStorage.removeItem(STORAGE_KEYS.goals);
        localStorage.removeItem(STORAGE_KEYS.submissions);
        localStorage.removeItem("proveit_buddy_earned");
        localStorage.removeItem("proveit_buddy_equipped");
        localStorage.removeItem("proveit_buddy_animal");
        clearGoalPlantSelections();
      } catch {
        // ignore
      }
    }
  }, []);

  const signOutWithSupabase = useCallback(async () => {
    if (useSupabase && supabase) {
      await supabase.auth.signOut();
    }
    setUserState(null);
    setGoalsState([]);
    setSubmissionsState([]);
    setHasSelectedPlan(false);
    setEarnedItems([]);
    setEquippedItemsState({});
    setGoalPlantSelections({});
    if (typeof window !== "undefined") {
      try {
        clearSbSessionSnapshot();
        localStorage.removeItem(STORAGE_KEYS.user);
        localStorage.removeItem(STORAGE_KEYS.goals);
        localStorage.removeItem(STORAGE_KEYS.submissions);
        localStorage.removeItem("proveit_buddy_earned");
        localStorage.removeItem("proveit_buddy_equipped");
        localStorage.removeItem("proveit_buddy_animal");
        clearGoalPlantSelections();
      } catch {
        // ignore
      }
    }
  }, [useSupabase, supabase]);

  const authReady = useSupabase ? (!authLoading && (!supabaseUser || dataLoaded)) : true;

  const value: AppContextValue = {
    user,
    goals,
    submissions,
    authReady,
    setUser,
    setPlan,
    addGoal,
    updateGoal,
    removeGoal,
    addSubmission,
    updateSubmission,
    deleteGoalHistory,
    canAddGoal: canAddGoalCheck,
    getSubmissionsForGoal,
    markGoalDone,
    earnedItems,
    equippedItems,
    setEquipped,
    checkAndAwardItems,
    goalPlantSelections,
    getGoalPlantVariant,
    setGoalPlantVariant,
    requestNotificationPermission,
    hasSelectedPlan,
    isDevGuestMode,
    clearPlanSelectionForNewUser,
    restoreActualAccount,
    signOut: useSupabase ? signOutWithSupabase : signOut,
    useSupabase,
    supabase: useSupabase ? supabase : null,
  };

  /** Blocks interaction until auth + first data load; never unmounts children (avoids resetting in-flight UIs like proof submit). */
  const showLoading = useSupabase && !authReady;

  return (
    <AppContext.Provider value={value}>
      <ThemeSync />
      <>
        <NotificationScheduler />
        <NotificationPrompt />
        {children}
      </>
      {showLoading ? (
        <div
          className="fixed inset-0 z-[200] flex min-h-[100dvh] flex-col items-center justify-center bg-slate-50 dark:bg-slate-950"
          aria-busy="true"
          aria-live="polite"
        >
          <LoadingView />
        </div>
      ) : null}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
