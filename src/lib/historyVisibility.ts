"use client";

const HISTORY_HIDDEN_GOALS_STORAGE_KEY = "proveit_history_hidden_goal_ids";

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

export function getStoredHiddenHistoryGoalIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_HIDDEN_GOALS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return unique(parsed.filter((value): value is string => typeof value === "string" && value.length > 0));
  } catch {
    return [];
  }
}

export function saveHiddenHistoryGoalIds(goalIds: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(HISTORY_HIDDEN_GOALS_STORAGE_KEY, JSON.stringify(unique(goalIds)));
}

export function hideGoalFromHistory(goalId: string, current: string[]): string[] {
  return unique([...current, goalId]);
}

export function showGoalInHistory(goalId: string, current: string[]): string[] {
  return current.filter((id) => id !== goalId);
}
