"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { normalizePlanId, type Goal, type GoalFrequency, type PlanId, type ProofSubmission } from "@/types";
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
  type StoredUser,
  STORAGE_KEYS,
} from "@/lib/store";
import { PLANS } from "@/types";
import { useSupabaseAuth } from "@/lib/supabase/hooks";
import { format } from "date-fns";
import { isWithinSubmissionWindow } from "@/lib/goalDue";
import {
  getStoredEarnedItems,
  getStoredEquippedItems,
  saveEarnedItems,
  saveEquippedItems,
  computeNewlyEarnedItems,
  type EquippedItems,
} from "@/lib/buddyItems";
import {
  clearGoalPlantSelections,
  getDefaultGoalPlantVariant,
  getStoredGoalPlantSelections,
  saveGoalPlantSelections,
  type GoalPlantVariant,
} from "@/lib/goalPlants";
import { NotificationScheduler } from "@/components/NotificationScheduler";
import { NotificationPrompt } from "@/components/NotificationPrompt";

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
  setPlan: (plan: PlanId, billing?: "monthly" | "yearly") => void | Promise<void>;
  addGoal: (goal: Omit<Goal, "id" | "userId" | "createdAt" | "completedDates">) => Promise<{ created: Goal | null; error?: string }>;
  updateGoal: (id: string, updates: Partial<Goal>) => void | Promise<void>;
  removeGoal: (id: string) => void | Promise<void>;
  addSubmission: (sub: Omit<ProofSubmission, "id" | "createdAt">) => ProofSubmission | Promise<ProofSubmission>;
  updateSubmission: (id: string, updates: Partial<ProofSubmission>) => void | Promise<void>;
  deleteGoalHistory: (goalId: string) => void | Promise<void>;
  canAddGoal: (frequency: GoalFrequency) => boolean;
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
  /** Dev-only: clear plan selection so app treats current user as new (plan picker). */
  clearPlanSelectionForNewUser: () => void;
  signOut: () => void | Promise<void>;
  useSupabase: boolean;
  supabase: import("@supabase/supabase-js").SupabaseClient | null;
}

const AppContext = createContext<AppContextValue | null>(null);

function useSupabaseConfigured() {
  return SUPABASE_CONFIGURED;
}

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

  useEffect(() => {
    if (useSupabase && supabase && supabaseUser) {
      setDataLoaded(false);
      Promise.allSettled([
        fetch("/api/profile").then((r) => r.json()),
        fetch("/api/goals").then((r) => r.json()),
        fetch("/api/submissions").then((r) => r.json()),
      ]).then(([profileResult, goalsResult, subsResult]) => {
        const p = profileResult.status === "fulfilled" ? profileResult.value?.profile : null;
        const profileUser = p
          ? {
              id: p.id,
              email: p.email,
              plan: normalizePlanId(p.plan),
              planBilling: p.planBilling,
              createdAt: p.createdAt ?? new Date().toISOString(),
            }
          : { id: supabaseUser.id, email: supabaseUser.email ?? "", plan: "free" as const, planBilling: undefined as undefined, createdAt: supabaseUser.created_at };
        setUserState(profileUser);

        const goalsRes = goalsResult.status === "fulfilled" ? goalsResult.value : null;
        const gs = goalsRes?.goals ?? [];
        const mappedGoals = gs.map((g: Record<string, unknown>) => ({
          id: g.id,
          userId: g.userId,
          title: g.title,
          description: g.description,
          frequency: g.frequency,
          reminderTime: g.reminderTime,
          reminderDay: g.reminderDay,
          reminderDays: Array.isArray(g.reminderDays) ? g.reminderDays : undefined,
          gracePeriod: g.gracePeriod,
          isOnBreak: g.isOnBreak === true,
          breakStartedAt: typeof g.breakStartedAt === "string" ? g.breakStartedAt : undefined,
          breakStreakSnapshot:
            typeof g.breakStreakSnapshot === "number" ? g.breakStreakSnapshot : undefined,
          streakCarryover: typeof g.streakCarryover === "number" ? g.streakCarryover : undefined,
          createdAt: g.createdAt,
          completedDates: g.completedDates ?? [],
        }));
        setGoalsState(mappedGoals);

        const subsRes = subsResult.status === "fulfilled" ? subsResult.value : null;
        const subs = subsRes?.submissions ?? [];
        setSubmissionsState(subs.map((s: Record<string, unknown>) => ({
          id: s.id,
          goalId: s.goalId,
          date: s.date,
          imageDataUrl: s.imageDataUrl,
          status: s.status,
          aiFeedback: s.aiFeedback,
          verifiedAt: s.verifiedAt,
          createdAt: s.createdAt,
        })));

        // Set hasSelectedPlan and goalPlantSelections in the same tick so no flash of wrong plant variants
        setGoalPlantSelections(getStoredGoalPlantSelections());
        const selectedOnThisDevice = hasStoredPlanSelection(profileUser.id);
        const selectedByAccount = profileUser.plan !== "free";
        const likelyExistingFreeUser = gs.length > 0 || subs.length > 0;
        setHasSelectedPlan(selectedOnThisDevice || selectedByAccount || likelyExistingFreeUser);
      }).finally(() => setDataLoaded(true));
      setHydrated(true);
      return;
    }
    if (useSupabase && !authLoading && !supabaseUser) {
      setUserState(null);
      setGoalsState([]);
      setSubmissionsState([]);
      setDataLoaded(true);
      setHydrated(true);
      return;
    }
    if (!useSupabase) {
      setUserState(getStoredUser());
      setGoalsState(getStoredGoals());
      setSubmissionsState(getStoredSubmissions());
      setDataLoaded(true);
      setHydrated(true);
      return;
    }
    if (useSupabase && authLoading) {
      setHydrated(true);
    }
  }, [useSupabase, supabaseUser, authLoading, supabase]);

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
    setHasSelectedPlan(selectedOnThisDevice || selectedByAccount || likelyExistingFreeUser);
  }, [user, goals.length, submissions.length]);

  const setUser = useCallback((u: StoredUser | null) => {
    if (!u) {
      setUserState(null);
      return;
    }
    setUserState({
      ...u,
      plan: normalizePlanId(u.plan),
    });
  }, []);

  const setPlan = useCallback(
    async (plan: PlanId, billing: "monthly" | "yearly" = "monthly") => {
      if (!user) return;
      if (useSupabase) {
        try {
          await fetch("/api/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plan, planBilling: billing }),
          });
        } catch {
          // fallback to local
        }
      }
      setUserState({
        ...user,
        plan,
        planBilling: plan === "free" ? undefined : billing,
      });
      markStoredPlanSelection(user.id);
      setHasSelectedPlan(true);
    },
    [user, useSupabase]
  );

  const clearPlanSelectionForNewUser = useCallback(() => {
    if (user?.id) {
      clearStoredPlanSelection(user.id);
      setHasSelectedPlan(false);
    }
  }, [user?.id]);

  const addGoal = useCallback(
    async (input: Omit<Goal, "id" | "userId" | "createdAt" | "completedDates">): Promise<{ created: Goal | null; error?: string }> => {
      const uid = user?.id ?? "anonymous";
      const dailyCount = goals.filter((g) => g.frequency === "daily").length;
      const weeklyCount = goals.filter((g) => g.frequency === "weekly").length;
      const count = input.frequency === "daily" ? dailyCount : weeklyCount;
      if (!canAddGoal(user?.plan ?? "free", input.frequency, count)) {
        return { created: null, error: input.frequency === "daily" ? "Daily goal limit reached." : "Weekly goal limit reached." };
      }
      const id = generateId();
      const goal: Goal = {
        ...input,
        id,
        userId: uid,
        createdAt: new Date().toISOString(),
        completedDates: [],
      };
      if (useSupabase) {
        try {
          const res = await fetch("/api/goals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id,
              title: goal.title,
              description: goal.description,
              frequency: goal.frequency,
              reminderTime: goal.reminderTime,
              reminderDay: goal.reminderDay,
              reminderDays: goal.reminderDays,
              gracePeriod: goal.gracePeriod ?? "eod",
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
            const msg =
              typeof data?.error === "string"
                ? data.error
                : typeof data?.message === "string"
                  ? data.message
                  : res.status === 401
                    ? "Please sign in again"
                    : res.status === 503
                      ? "Server is not configured. Try again later."
                      : res.statusText || `Error ${res.status}`;
            console.error("Failed to create goal:", msg);
            return { created: null, error: msg };
          }
          const created = data?.goal as Goal | undefined;
          if (!created?.id) {
            return { created: null, error: "Server did not return the new goal. Try again." };
          }
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
    async (id: string, updates: Partial<Goal>) => {
      if (useSupabase) {
        try {
          await fetch("/api/goals", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id,
              ...updates,
              reminderTime: updates.reminderTime,
              reminderDay: updates.reminderDay,
              reminderDays: updates.reminderDays,
              gracePeriod: updates.gracePeriod,
            }),
          });
        } catch {
          // fallback to local
        }
      }
      setGoalsState((prev) =>
        prev.map((g) => (g.id === id ? { ...g, ...updates } : g))
      );
    },
    [useSupabase]
  );

  const removeGoal = useCallback(
    async (id: string) => {
      if (useSupabase) {
        try {
          await fetch(`/api/goals?id=${encodeURIComponent(id)}`, { method: "DELETE" });
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
          if (!res.ok) return sub;
          const created = data.submission as ProofSubmission;
          setSubmissionsState((prev) => [...prev, created]);
          return created;
        } catch {
          // fallback to local
        }
      }
      setSubmissionsState((prev) => [...prev, sub]);
      return sub;
    },
    [useSupabase]
  );

  const updateSubmission = useCallback(
    async (id: string, updates: Partial<ProofSubmission>) => {
      if (useSupabase) {
        try {
          await fetch("/api/submissions", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...updates }),
          });
        } catch {
          // fallback to local
        }
      }
      setSubmissionsState((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
      );
    },
    [useSupabase]
  );

  const deleteGoalHistory = useCallback(
    async (goalId: string) => {
      if (useSupabase) {
        try {
          await fetch(`/api/submissions?goalId=${encodeURIComponent(goalId)}`, { method: "DELETE" });
        } catch {
          // fallback to local
        }
        try {
          await fetch("/api/goals", {
            method: "PATCH",
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
    (frequency: GoalFrequency) => {
      const planId = user?.plan ?? "free";
      const dailyCount = goals.filter((g) => g.frequency === "daily").length;
      const weeklyCount = goals.filter((g) => g.frequency === "weekly").length;
      const count = frequency === "daily" ? dailyCount : weeklyCount;
      return canAddGoal(planId, frequency, count);
    },
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
      if (!isWithinSubmissionWindow(g)) return; // Only allow while submissions are open
      const dateStr = format(new Date(), "yyyy-MM-dd");
      const existing = submissions.find((s) => s.goalId === goalId && s.date === dateStr);
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
        await updateGoal(goalId, { completedDates: [...g.completedDates, dateStr] });
      }
    },
    [goals, submissions, addSubmission, updateGoal]
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
      return goalPlantSelections[goalId] ?? getDefaultGoalPlantVariant(goalId);
    },
    [goalPlantSelections]
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
    clearPlanSelectionForNewUser,
    signOut: useSupabase ? signOutWithSupabase : signOut,
    useSupabase,
    supabase: useSupabase ? supabase : null,
  };

  const showLoading = useSupabase && !authReady;

  return (
    <AppContext.Provider value={value}>
      {showLoading ? (
        <main className="flex min-h-screen items-center justify-center bg-white dark:bg-black">
          <div className="flex flex-col items-center gap-3">
            <div
              className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-prove-600 dark:border-slate-700 dark:border-t-prove-500"
              aria-hidden
            />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
          </div>
        </main>
      ) : (
        <>
          <NotificationScheduler />
          <NotificationPrompt />
          {children}
        </>
      )}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
