const KEY = "proveit_welcome_week_flash";

export type WelcomeWeekFlash = {
  goalId: string;
  goalTitle: string;
};

export function setWelcomeWeekFlash(flash: WelcomeWeekFlash): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(flash));
  } catch {
    /* ignore */
  }
}

export function consumeWelcomeWeekFlash(): WelcomeWeekFlash | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    window.sessionStorage.removeItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WelcomeWeekFlash;
  } catch {
    return null;
  }
}
