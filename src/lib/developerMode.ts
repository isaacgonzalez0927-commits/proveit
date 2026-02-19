export interface DeveloperModeSettings {
  enabled: boolean;
  overrideMaxStreak: number | null;
  overrideGoalsDoneToday: number | null;
  overrideTotalDueToday: number | null;
  goalStreakOverrides: Record<string, number>;
}

const STORAGE_KEY = "proveit_developer_mode";

export const DEFAULT_DEVELOPER_MODE_SETTINGS: DeveloperModeSettings = {
  enabled: false,
  overrideMaxStreak: null,
  overrideGoalsDoneToday: null,
  overrideTotalDueToday: null,
  goalStreakOverrides: {},
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

function toGoalStreakOverrides(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  const entries = Object.entries(value as Record<string, unknown>);
  const next: Record<string, number> = {};
  for (const [goalId, rawValue] of entries) {
    const parsed = toNonNegativeInt(rawValue);
    if (parsed != null) next[goalId] = parsed;
  }
  return next;
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
      goalStreakOverrides: toGoalStreakOverrides(parsed.goalStreakOverrides),
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

export function applyGoalStreakOverride(
  goalId: string,
  actualStreak: number,
  settings: DeveloperModeSettings
) {
  if (!settings.enabled) return Math.max(0, actualStreak);
  const override = settings.goalStreakOverrides[goalId];
  if (typeof override !== "number" || !Number.isFinite(override)) {
    return Math.max(0, actualStreak);
  }
  return Math.max(0, Math.floor(override));
}
