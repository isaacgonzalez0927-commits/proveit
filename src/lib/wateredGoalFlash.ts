const STORAGE_KEY = "proveit_last_watered_goal";

export function setWateredGoalFlash(goalId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, goalId);
  } catch {
    /* ignore */
  }
}

export function consumeWateredGoalFlash(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const id = window.sessionStorage.getItem(STORAGE_KEY);
    if (id) window.sessionStorage.removeItem(STORAGE_KEY);
    return id;
  } catch {
    return null;
  }
}
