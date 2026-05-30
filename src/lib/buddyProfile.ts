import {
  clampVariantForPlan,
  getDefaultGoalPlantVariant,
  type GoalPlantVariant,
} from "@/lib/goalPlants";
import {
  ACCENT_THEME_OPTIONS,
  sanitizeAccentThemeForPlan,
  type AccentTheme,
} from "@/lib/theme";
import type { PlanId } from "@/types";

export type BuddyProfileVisibility = "shared_goals_only" | "friend_link";

export interface BuddyProfilePublic {
  userId: string;
  displayName: string;
  username?: string;
  avatarPlant: GoalPlantVariant;
  accentTheme: AccentTheme;
  visibility: BuddyProfileVisibility;
  friendCode?: string;
  isYou?: boolean;
  stats: {
    activeGoals: number;
    unlockedAchievements: number;
    maxStreak: number;
    proofsThisWeek: number;
  };
  sharedGoalTitles: string[];
}

export interface BuddyProfileSettings {
  avatarPlant: GoalPlantVariant;
  accentTheme: AccentTheme;
  visibility: BuddyProfileVisibility;
  friendCode: string | null;
  friendLinkUrl: string | null;
}

const FRIEND_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateBuddyFriendCode(): string {
  let code = "";
  for (let i = 0; i < 8; i += 1) {
    code += FRIEND_CODE_CHARS[Math.floor(Math.random() * FRIEND_CODE_CHARS.length)];
  }
  return code;
}

export function normalizeBuddyFriendCode(raw: string): string | null {
  const code = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (code.length < 6 || code.length > 12) return null;
  return code;
}

export function buddyFriendLinkPath(code: string): string {
  return `/buddy-connect/${encodeURIComponent(code.trim().toUpperCase())}`;
}

export function buddyFriendLinkUrl(origin: string, code: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}${buddyFriendLinkPath(code)}`;
}

export function sanitizeBuddyAvatarPlant(
  raw: unknown,
  plan: PlanId,
  fallbackGoalId?: string
): GoalPlantVariant {
  const n = typeof raw === "number" ? raw : typeof raw === "string" ? parseInt(raw, 10) : NaN;
  const variant =
    Number.isInteger(n) && n >= 1 && n <= 8
      ? (n as GoalPlantVariant)
      : fallbackGoalId
        ? getDefaultGoalPlantVariant(fallbackGoalId)
        : 1;
  return clampVariantForPlan(variant, plan);
}

export function sanitizeBuddyProfileAccent(raw: unknown, plan: PlanId): AccentTheme {
  const value = typeof raw === "string" ? raw.trim() : "";
  const match = ACCENT_THEME_OPTIONS.find((o) => o.id === value);
  if (!match) return "green";
  return sanitizeAccentThemeForPlan(match.id, plan);
}

export function normalizeBuddyVisibility(raw: unknown): BuddyProfileVisibility {
  return raw === "friend_link" ? "friend_link" : "shared_goals_only";
}

function accentSwatchColor(accent: AccentTheme): string {
  const option = ACCENT_THEME_OPTIONS.find((o) => o.id === accent) ?? ACCENT_THEME_OPTIONS[0];
  return option.swatchColor;
}

/** CSS gradient for profile page header bands. */
export function buddyProfileBackgroundStyle(accent: AccentTheme): {
  background: string;
} {
  const c = accentSwatchColor(accent);
  return {
    background: `linear-gradient(145deg, ${c}33 0%, ${c}66 45%, ${c}99 100%)`,
  };
}

/** Fill for the circular profile photo — theme color behind the plant. */
export function buddyProfileAvatarBackgroundStyle(accent: AccentTheme): {
  background: string;
} {
  const c = accentSwatchColor(accent);
  return {
    background: `radial-gradient(circle at 50% 88%, color-mix(in srgb, ${c} 92%, white) 0%, ${c} 52%, color-mix(in srgb, ${c} 75%, #0f172a) 100%)`,
  };
}

export function displayNameFromBuddyRow(row: {
  name?: string | null;
  username?: string | null;
}): string {
  if (row.name && String(row.name).trim()) return String(row.name).trim();
  if (row.username && String(row.username).trim()) return String(row.username).trim();
  return "Buddy";
}
