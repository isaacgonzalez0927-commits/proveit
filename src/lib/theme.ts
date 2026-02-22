import type { PlanId } from "@/types";

export type ThemeMode = "light" | "dark" | "system";
export type AccentTheme = "green" | "pink" | "violet" | "ocean" | "orange" | "amber" | "red" | "purple" | "indigo" | "teal";

export const THEME_STORAGE_KEY = "proveit-theme";
export const ACCENT_THEME_STORAGE_KEY = "proveit-accent-theme";
export const DEFAULT_THEME_MODE: ThemeMode = "system";
export const DEFAULT_ACCENT_THEME: AccentTheme = "green";

/** Themes included in Pro (4). Premium gets all. */
export const PRO_ACCENT_THEMES: AccentTheme[] = ["pink", "violet", "ocean", "teal"];

export const ACCENT_THEME_OPTIONS: Array<{
  id: AccentTheme;
  label: string;
  swatchClassName: string;
  paidOnly: boolean;
  premiumOnly: boolean;
}> = [
  { id: "green", label: "Green", swatchClassName: "bg-emerald-500", paidOnly: false, premiumOnly: false },
  { id: "pink", label: "Pink", swatchClassName: "bg-rose-500", paidOnly: true, premiumOnly: false },
  { id: "violet", label: "Violet", swatchClassName: "bg-violet-500", paidOnly: true, premiumOnly: false },
  { id: "ocean", label: "Ocean", swatchClassName: "bg-sky-500", paidOnly: true, premiumOnly: false },
  { id: "teal", label: "Teal", swatchClassName: "bg-teal-500", paidOnly: true, premiumOnly: false },
  { id: "orange", label: "Orange", swatchClassName: "bg-orange-500", paidOnly: true, premiumOnly: true },
  { id: "amber", label: "Amber", swatchClassName: "bg-amber-500", paidOnly: true, premiumOnly: true },
  { id: "red", label: "Red", swatchClassName: "bg-red-500", paidOnly: true, premiumOnly: true },
  { id: "purple", label: "Purple", swatchClassName: "bg-purple-500", paidOnly: true, premiumOnly: true },
  { id: "indigo", label: "Indigo", swatchClassName: "bg-indigo-500", paidOnly: true, premiumOnly: true },
];

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

function isAccentTheme(value: string | null): value is AccentTheme {
  return value === "green" || value === "pink" || value === "violet" || value === "ocean" || 
         value === "orange" || value === "amber" || value === "red" || value === "purple" || 
         value === "indigo" || value === "teal";
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
  return plan === "pro" || plan === "premium";
}

export function canUseAccentTheme(plan: PlanId | null | undefined, accent: AccentTheme): boolean {
  if (accent === "green") return true;
  if (plan === "premium") return true;
  if (plan === "pro") return PRO_ACCENT_THEMES.includes(accent);
  return false;
}

export function sanitizeAccentThemeForPlan(
  accent: AccentTheme,
  plan: PlanId | null | undefined
): AccentTheme {
  if (canUseAccentTheme(plan, accent)) return accent;
  return "green";
}
