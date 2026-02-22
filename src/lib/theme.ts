import type { PlanId } from "@/types";

export type ThemeMode = "light" | "dark" | "system";
export type AccentTheme = "green" | "pink" | "violet" | "ocean";

export const THEME_STORAGE_KEY = "proveit-theme";
export const ACCENT_THEME_STORAGE_KEY = "proveit-accent-theme";
export const DEFAULT_THEME_MODE: ThemeMode = "system";
export const DEFAULT_ACCENT_THEME: AccentTheme = "green";

export const ACCENT_THEME_OPTIONS: Array<{
  id: AccentTheme;
  label: string;
  swatchClassName: string;
  paidOnly: boolean;
}> = [
  {
    id: "green",
    label: "Green",
    swatchClassName: "bg-emerald-500",
    paidOnly: false,
  },
  {
    id: "pink",
    label: "Pink",
    swatchClassName: "bg-rose-500",
    paidOnly: true,
  },
  {
    id: "violet",
    label: "Violet",
    swatchClassName: "bg-violet-500",
    paidOnly: true,
  },
  {
    id: "ocean",
    label: "Ocean",
    swatchClassName: "bg-sky-500",
    paidOnly: true,
  },
];

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

function isAccentTheme(value: string | null): value is AccentTheme {
  return value === "green" || value === "pink" || value === "violet" || value === "ocean";
}

export function getStoredThemeMode(): ThemeMode {
  if (typeof window === "undefined") return DEFAULT_THEME_MODE;
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isThemeMode(stored) ? stored : DEFAULT_THEME_MODE;
}

export function getStoredAccentTheme(): AccentTheme {
  if (typeof window === "undefined") return DEFAULT_ACCENT_THEME;
  const stored = window.localStorage.getItem(ACCENT_THEME_STORAGE_KEY);
  return isAccentTheme(stored) ? stored : DEFAULT_ACCENT_THEME;
}

export function applyThemeMode(theme: ThemeMode) {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = theme === "dark" || (theme === "system" && systemPrefersDark);
  document.documentElement.classList.toggle("dark", isDark);
}

export function applyAccentTheme(accent: AccentTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-accent-theme", accent);
}

export function saveAndApplyThemeMode(theme: ThemeMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyThemeMode(theme);
}

export function saveAndApplyAccentTheme(accent: AccentTheme) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCENT_THEME_STORAGE_KEY, accent);
  applyAccentTheme(accent);
}

export function getEffectiveIsDark(theme: ThemeMode): boolean {
  if (typeof window === "undefined") return false;
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return theme === "dark" || (theme === "system" && systemPrefersDark);
}

export function canUsePaidAccentThemes(plan: PlanId | null | undefined): boolean {
  return plan === "pro";
}

export function sanitizeAccentThemeForPlan(
  accent: AccentTheme,
  plan: PlanId | null | undefined
): AccentTheme {
  if (!canUsePaidAccentThemes(plan) && accent !== "green") {
    return "green";
  }
  return accent;
}
