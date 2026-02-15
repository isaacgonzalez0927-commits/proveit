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

const SUPABASE_CONFIGURED = !!(
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

interface AppContextValue {
  user: StoredUser | null;
  goals: Goal[];
  submissions: ProofSubmission[];
  setUser: (user: StoredUser | null) => void;
  setPlan: (plan: PlanId) => void | Promise<void>;
  addGoal: (goal: Omit<Goal, "id" | "userId" | "createdAt" | "completedDates">) => Goal | null | Promise<Goal | null>;
  updateGoal: (id: string, updates: Partial<Goal>) => void | Promise<void>;
  removeGoal: (id: string) => void | Promise<void>;
  addSubmission: (sub: Omit<ProofSubmission, "id" | "createdAt">) => ProofSubmission | Promise<ProofSubmission>;
  updateSubmission: (id: string, updates: Partial<ProofSubmission>) => void | Promise<void>;
  canAddGoal: (frequency: GoalFrequency) => boolean;
  getSubmissionsForGoal: (goalId: string) => ProofSubmission[];
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

  useEffect(() => {
    if (useSupabase && supabase && supabaseUser) {
      fetch("/api/profile")
        .then((r) => r.json())
        .then((data) => {
          const p = data.profile;
          if (p) setUserState({ id: p.id, email: p.email, plan: p.plan, createdAt: p.createdAt });
        })
        .catch(() => {});
      fetch("/api/goals")
        .then((r) => r.json())
        .then((data) => {
          const gs = data.goals ?? [];
          setGoalsState(gs.map((g: Record<string, unknown>) => ({
            id: g.id,
            userId: g.userId,
            title: g.title,
            description: g.description,
            frequency: g.frequency,
            reminderTime: g.reminderTime,
            reminderDay: g.reminderDay,
            createdAt: g.createdAt,
            completedDates: g.completedDates ?? [],
          })));
        })
        .catch(() => {});
      fetch("/api/submissions")
        .then((r) => r.json())
        .then((data) => {
          const subs = data.submissions ?? [];
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
        })
        .catch(() => {});
      setHydrated(true);
      return;
    }
    if (useSupabase && !authLoading && !supabaseUser) {
      setUserState(null);
      setGoalsState([]);
      setSubmissionsState([]);
      setHydrated(true);
      return;
    }
    if (!useSupabase) {
      setUserState(getStoredUser());
      setGoalsState(getStoredGoals());
      setSubmissionsState(getStoredSubmissions());
      setHydrated(true);
      return;
    }
    if (useSupabase && authLoading) {
      setHydrated(true);
    }
  }, [useSupabase, supabaseUser, authLoading, supabase]);

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
    async (plan: PlanId) => {
      if (!user) return;
      if (useSupabase) {
        try {
          await fetch("/api/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plan }),
          });
        } catch {
          // fallback to local
        }
      }
      setUserState({ ...user, plan });
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
            }),
          });
          const data = await res.json();
          if (!res.ok) return null;
          const created = data.goal as Goal;
          setGoalsState((prev) => [...prev, created]);
          return created;
        } catch {
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

  const requestNotificationPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const result = await Notification.requestPermission();
    return result === "granted";
  }, []);

  const signOut = useCallback(() => {
    setUserState(null);
    setGoalsState([]);
    setSubmissionsState([]);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEYS.user);
        localStorage.removeItem(STORAGE_KEYS.goals);
        localStorage.removeItem(STORAGE_KEYS.submissions);
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
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEYS.user);
        localStorage.removeItem(STORAGE_KEYS.goals);
        localStorage.removeItem(STORAGE_KEYS.submissions);
      } catch {
        // ignore
      }
    }
  }, [useSupabase, supabase]);

  const value: AppContextValue = {
    user,
    goals,
    submissions,
    setUser,
    setPlan,
    addGoal,
    updateGoal,
    removeGoal,
    addSubmission,
    updateSubmission,
    canAddGoal: canAddGoalCheck,
    getSubmissionsForGoal,
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
