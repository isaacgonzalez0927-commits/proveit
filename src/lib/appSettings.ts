"use client";

import type { GoalFrequency, GracePeriod } from "@/types";
import type { GoalPlantVariant } from "@/lib/goalPlants";

export interface AppSettings {
  defaultGoalFrequency: GoalFrequency;
  defaultGoalGracePeriod: GracePeriod;
  defaultGoalPlantVariant: GoalPlantVariant;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  defaultGoalFrequency: "daily",
  defaultGoalGracePeriod: "eod",
  defaultGoalPlantVariant: 1,
};

const APP_SETTINGS_STORAGE_KEY = "proveit_app_settings";

function normalizeFrequency(value: unknown): GoalFrequency | null {
  return value === "daily" || value === "weekly" ? value : null;
}

function normalizeGracePeriod(value: unknown): GracePeriod | null {
  return value === "1h" || value === "3h" || value === "6h" || value === "12h" || value === "eod"
    ? value
    : null;
}

function normalizePlantVariant(value: unknown): GoalPlantVariant | null {
  if (value === 1 || value === 2 || value === 3 || value === 4) return value;
  if (value === "1" || value === "2" || value === "3" || value === "4") {
    return Number(value) as GoalPlantVariant;
  }
  return null;
}

export function getStoredAppSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_APP_SETTINGS;
  try {
    const raw = localStorage.getItem(APP_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_APP_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      defaultGoalFrequency:
        normalizeFrequency(parsed.defaultGoalFrequency) ?? DEFAULT_APP_SETTINGS.defaultGoalFrequency,
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
