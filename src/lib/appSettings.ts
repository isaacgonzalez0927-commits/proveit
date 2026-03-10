"use client";

import type { GracePeriod } from "@/types";
import type { GoalPlantVariant } from "@/lib/goalPlants";

export interface AppSettings {
  defaultGoalGracePeriod: GracePeriod;
  defaultGoalPlantVariant: GoalPlantVariant;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  defaultGoalGracePeriod: "eod",
  defaultGoalPlantVariant: 1,
};

const APP_SETTINGS_STORAGE_KEY = "proveit_app_settings";

function normalizeGracePeriod(value: unknown): GracePeriod | null {
  return value === "1h" || value === "3h" || value === "6h" || value === "12h" || value === "eod"
    ? value
    : null;
}

function normalizePlantVariant(value: unknown): GoalPlantVariant | null {
  const n = typeof value === "string" ? parseInt(value, 10) : value;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > 10) return null;
  return n as GoalPlantVariant;
}

export function getStoredAppSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_APP_SETTINGS;
  try {
    const raw = localStorage.getItem(APP_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_APP_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      defaultGoalGracePeriod:
        normalizeGracePeriod(parsed.defaultGoalGracePeriod) ?? DEFAULT_APP_SETTINGS.defaultGoalGracePeriod,
      defaultGoalPlantVariant:
        normalizePlantVariant(parsed.defaultGoalPlantVariant) ?? DEFAULT_APP_SETTINGS.defaultGoalPlantVariant,
    };
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

export function saveAppSettings(settings: AppSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}
