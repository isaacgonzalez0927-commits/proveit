"use client";

export interface HistoryDisplaySettings {
  showProofPhotos: boolean;
  showStreak: boolean;
  showVerifiedCount: boolean;
  showThisWeekBadge: boolean;
}

export const DEFAULT_HISTORY_DISPLAY_SETTINGS: HistoryDisplaySettings = {
  showProofPhotos: true,
  showStreak: true,
  showVerifiedCount: true,
  showThisWeekBadge: true,
};

const HISTORY_SETTINGS_STORAGE_KEY = "proveit_history_display_settings";

export function getStoredHistoryDisplaySettings(): HistoryDisplaySettings {
  if (typeof window === "undefined") return DEFAULT_HISTORY_DISPLAY_SETTINGS;
  try {
    const raw = localStorage.getItem(HISTORY_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_HISTORY_DISPLAY_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<HistoryDisplaySettings>;
    return {
      showProofPhotos: parsed.showProofPhotos ?? DEFAULT_HISTORY_DISPLAY_SETTINGS.showProofPhotos,
      showStreak: parsed.showStreak ?? DEFAULT_HISTORY_DISPLAY_SETTINGS.showStreak,
      showVerifiedCount: parsed.showVerifiedCount ?? DEFAULT_HISTORY_DISPLAY_SETTINGS.showVerifiedCount,
      showThisWeekBadge: parsed.showThisWeekBadge ?? DEFAULT_HISTORY_DISPLAY_SETTINGS.showThisWeekBadge,
    };
  } catch {
    return DEFAULT_HISTORY_DISPLAY_SETTINGS;
  }
}

export function saveHistoryDisplaySettings(settings: HistoryDisplaySettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(HISTORY_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}
