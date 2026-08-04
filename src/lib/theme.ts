import type { PlanId } from "@/types";

export type ThemeMode = "light" | "dark" | "system";
/** `green` is a legacy alias migrated to `mint` (Default). */
export type AccentTheme =
  | "green"
  | "pink"
  | "violet"
  | "ocean"
  | "orange"
  | "amber"
  | "red"
  | "purple"
  | "indigo"
  | "teal"
  | "mint"
  | "white"
  | "black"
  | "slate"
  | "gold";

export const THEME_STORAGE_KEY = "proveit-theme";
export const ACCENT_THEME_STORAGE_KEY = "proveit-accent-theme";
export const DEFAULT_THEME_MODE: ThemeMode = "light";
/** Brand default — mint emerald `#10b981`. */
export const DEFAULT_ACCENT_THEME: AccentTheme = "mint";
export const DEFAULT_ACCENT_HEX = "#10b981";

/** Themes included in Pro (6). Premium gets all colors. */
export const PRO_ACCENT_THEMES: AccentTheme[] = ["pink", "violet", "ocean", "teal", "orange", "amber"];

/** Free accents available on every plan (mint default + mono chrome ways). */
export const FREE_ACCENT_THEMES: AccentTheme[] = ["mint", "white", "black"];

export const ACCENT_THEME_OPTIONS: Array<{
  id: AccentTheme;
  label: string;
  swatchClassName: string;
  swatchColor: string;
  paidOnly: boolean;
  premiumOnly: boolean;
}> = [
  { id: "mint", label: "Default", swatchClassName: "bg-emerald-500", swatchColor: DEFAULT_ACCENT_HEX, paidOnly: false, premiumOnly: false },
  { id: "white", label: "White", swatchClassName: "bg-white", swatchColor: "#ffffff", paidOnly: false, premiumOnly: false },
  { id: "black", label: "Black", swatchClassName: "bg-neutral-950", swatchColor: "#0a0a0a", paidOnly: false, premiumOnly: false },
  { id: "pink", label: "Pink", swatchClassName: "bg-pink-500", swatchColor: "#ec4899", paidOnly: true, premiumOnly: false },
  { id: "violet", label: "Violet", swatchClassName: "bg-violet-500", swatchColor: "#8b5cf6", paidOnly: true, premiumOnly: false },
  { id: "ocean", label: "Ocean", swatchClassName: "bg-sky-500", swatchColor: "#0ea5e9", paidOnly: true, premiumOnly: false },
  { id: "teal", label: "Teal", swatchClassName: "bg-teal-500", swatchColor: "#14b8a6", paidOnly: true, premiumOnly: false },
  { id: "orange", label: "Orange", swatchClassName: "bg-orange-500", swatchColor: "#f97316", paidOnly: true, premiumOnly: true },
  { id: "amber", label: "Amber", swatchClassName: "bg-amber-500", swatchColor: "#f59e0b", paidOnly: true, premiumOnly: true },
  { id: "red", label: "Red", swatchClassName: "bg-red-500", swatchColor: "#ef4444", paidOnly: true, premiumOnly: true },
  { id: "purple", label: "Purple", swatchClassName: "bg-purple-500", swatchColor: "#a855f7", paidOnly: true, premiumOnly: true },
  { id: "indigo", label: "Indigo", swatchClassName: "bg-indigo-500", swatchColor: "#6366f1", paidOnly: true, premiumOnly: true },
  { id: "slate", label: "Slate", swatchClassName: "bg-slate-500", swatchColor: "#64748b", paidOnly: true, premiumOnly: true },
  { id: "gold", label: "Gold", swatchClassName: "bg-yellow-500", swatchColor: "#eab308", paidOnly: true, premiumOnly: true },
];

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

function isAccentTheme(value: string | null): value is AccentTheme {
  return (
    value === "green" ||
    value === "pink" ||
    value === "violet" ||
    value === "ocean" ||
    value === "orange" ||
    value === "amber" ||
    value === "red" ||
    value === "purple" ||
    value === "indigo" ||
    value === "teal" ||
    value === "mint" ||
    value === "white" ||
    value === "black" ||
    value === "slate" ||
    value === "gold"
  );
}

/** Map legacy `green` / lime default to mint. */
export function normalizeAccentTheme(accent: AccentTheme): AccentTheme {
  return accent === "green" ? "mint" : accent;
}

export function getStoredThemeMode(): ThemeMode {
  if (typeof window === "undefined") return DEFAULT_THEME_MODE;
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isThemeMode(stored) ? stored : DEFAULT_THEME_MODE;
}

export function getStoredAccentTheme(): AccentTheme {
  if (typeof window === "undefined") return DEFAULT_ACCENT_THEME;
  const stored = window.localStorage.getItem(ACCENT_THEME_STORAGE_KEY);
  if (!isAccentTheme(stored)) return DEFAULT_ACCENT_THEME;
  return normalizeAccentTheme(stored);
}

export function applyThemeMode(theme: ThemeMode) {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = theme === "dark" || (theme === "system" && systemPrefersDark);
  document.documentElement.classList.toggle("dark", isDark);
}

export function applyAccentTheme(accent: AccentTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-accent-theme", normalizeAccentTheme(accent));
}

export function saveAndApplyThemeMode(theme: ThemeMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyThemeMode(theme);
}

export function saveAndApplyAccentTheme(accent: AccentTheme) {
  if (typeof window === "undefined") return;
  const normalized = normalizeAccentTheme(accent);
  window.localStorage.setItem(ACCENT_THEME_STORAGE_KEY, normalized);
  applyAccentTheme(normalized);
}

export function getEffectiveIsDark(theme: ThemeMode): boolean {
  if (typeof window === "undefined") return theme !== "light";
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return theme === "dark" || (theme === "system" && systemPrefersDark);
}

export function canUsePaidAccentThemes(plan: PlanId | null | undefined): boolean {
  return plan === "pro" || plan === "premium";
}

export function canUseAccentTheme(plan: PlanId | null | undefined, accent: AccentTheme): boolean {
  const normalized = normalizeAccentTheme(accent);
  if (FREE_ACCENT_THEMES.includes(normalized)) return true;
  if (plan === "premium") return true;
  if (plan === "pro") return PRO_ACCENT_THEMES.includes(normalized);
  return false;
}

export function sanitizeAccentThemeForPlan(
  accent: AccentTheme,
  plan: PlanId | null | undefined
): AccentTheme {
  const normalized = normalizeAccentTheme(accent);
  if (canUseAccentTheme(plan, normalized)) return normalized;
  return DEFAULT_ACCENT_THEME;
}
