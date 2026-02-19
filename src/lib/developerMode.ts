export interface DeveloperModeSettings {
  enabled: boolean;
  overrideMaxStreak: number | null;
  overrideGoalsDoneToday: number | null;
  overrideTotalDueToday: number | null;
}

const STORAGE_KEY = "proveit_developer_mode";

export const DEFAULT_DEVELOPER_MODE_SETTINGS: DeveloperModeSettings = {
  enabled: false,
  overrideMaxStreak: null,
  overrideGoalsDoneToday: null,
  overrideTotalDueToday: null,
};

function toNonNegativeInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return null;
}

export function getStoredDeveloperModeSettings(): DeveloperModeSettings {
  if (typeof window === "undefined") return DEFAULT_DEVELOPER_MODE_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DEVELOPER_MODE_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<DeveloperModeSettings>;
    return {
      enabled: !!parsed.enabled,
      overrideMaxStreak: toNonNegativeInt(parsed.overrideMaxStreak),
      overrideGoalsDoneToday: toNonNegativeInt(parsed.overrideGoalsDoneToday),
      overrideTotalDueToday: toNonNegativeInt(parsed.overrideTotalDueToday),
    };
  } catch {
    return DEFAULT_DEVELOPER_MODE_SETTINGS;
  }
}

export function saveDeveloperModeSettings(settings: DeveloperModeSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function applyDeveloperModeNumbers(
  values: { maxStreak: number; goalsDoneToday: number; totalDueToday: number },
  settings: DeveloperModeSettings
) {
  if (!settings.enabled) return values;
  const totalDueToday = Math.max(
    0,
    settings.overrideTotalDueToday ?? values.totalDueToday
  );
  const goalsDoneTodayRaw = Math.max(
    0,
    settings.overrideGoalsDoneToday ?? values.goalsDoneToday
  );
  return {
    maxStreak: Math.max(0, settings.overrideMaxStreak ?? values.maxStreak),
    totalDueToday,
    goalsDoneToday: Math.min(goalsDoneTodayRaw, totalDueToday),
  };
}
