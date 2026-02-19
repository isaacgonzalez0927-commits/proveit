"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Goal, GoalFrequency, PlanId, ProofSubmission } from "@/types";
import {
  getStoredUser,
  getStoredGoals,
  getStoredSubmissions,
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
  addGoal: (goal: Omit<Goal, "id" | "userId" | "createdAt" | "completedDates">) => Goal | null | Promise<Goal | null>;
  updateGoal: (id: string, updates: Partial<Goal>) => void | Promise<void>;
  removeGoal: (id: string) => void | Promise<void>;
  addSubmission: (sub: Omit<ProofSubmission, "id" | "createdAt">) => ProofSubmission | Promise<ProofSubmission>;
  updateSubmission: (id: string, updates: Partial<ProofSubmission>) => void | Promise<void>;
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
  signOut: () => void;
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

  useEffect(() => {
    if (useSupabase && supabase && supabaseUser) {
      setDataLoaded(false);
      Promise.allSettled([
        fetch("/api/profile").then((r) => r.json()),
        fetch("/api/goals").then((r) => r.json()),
        fetch("/api/submissions").then((r) => r.json()),
      ]).then(([profileResult, goalsResult, subsResult]) => {
        const p = profileResult.status === "fulfilled" ? profileResult.value?.profile : null;
        if (p) {
          setUserState({
            id: p.id,
            email: p.email,
            plan: p.plan ?? "free",
            planBilling: p.planBilling,
            createdAt: p.createdAt ?? new Date().toISOString(),
          });
        } else if (supabaseUser) {
          setUserState({ id: supabaseUser.id, email: supabaseUser.email ?? "", plan: "free", createdAt: supabaseUser.created_at });
        }
        const goalsRes = goalsResult.status === "fulfilled" ? goalsResult.value : null;
        const gs = goalsRes?.goals ?? [];
        setGoalsState(gs.map((g: Record<string, unknown>) => ({
          id: g.id,
          userId: g.userId,
          title: g.title,
          description: g.description,
          frequency: g.frequency,
          reminderTime: g.reminderTime,
          reminderDay: g.reminderDay,
          gracePeriod: g.gracePeriod,
          createdAt: g.createdAt,
          completedDates: g.completedDates ?? [],
        })));
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

  const setUser = useCallback((u: StoredUser | null) => {
    setUserState(u);
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
    },
    [user, useSupabase]
  );

  const addGoal = useCallback(
    async (input: Omit<Goal, "id" | "userId" | "createdAt" | "completedDates">) => {
      const uid = user?.id ?? "anonymous";
      const dailyCount = goals.filter((g) => g.frequency === "daily").length;
      const weeklyCount = goals.filter((g) => g.frequency === "weekly").length;
      const count = input.frequency === "daily" ? dailyCount : weeklyCount;
      if (!canAddGoal(user?.plan ?? "free", input.frequency, count)) return null;
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
              gracePeriod: goal.gracePeriod ?? "eod",
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            console.error("Failed to create goal:", data?.error ?? res.statusText);
            return null;
          }
          const created = data.goal as Goal;
          setGoalsState((prev) => [...prev, created]);
          return created;
        } catch (error) {
          console.error("Failed to create goal:", error);
          return null;
        }
      }
      setGoalsState((prev) => [...prev, goal]);
      return goal;
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
      if (!isWithinSubmissionWindow(g)) return; // Only allow on due day
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

  const value: AppContextValue = {
    user,
    goals,
    submissions,
    authReady: useSupabase ? (!authLoading && (!supabaseUser || dataLoaded)) : true,
    setUser,
    setPlan,
    addGoal,
    updateGoal,
    removeGoal,
    addSubmission,
    updateSubmission,
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
    signOut: useSupabase ? signOutWithSupabase : signOut,
    useSupabase,
    supabase: useSupabase ? supabase : null,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
