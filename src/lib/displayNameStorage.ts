const LEGACY_DISPLAY_NAME_KEY = "proveit_display_name";

export function displayNameStorageKey(userId: string): string {
  return `proveit_display_name_${userId}`;
}

/** Per-account display name from onboarding (not shared across logins). */
export function readStoredDisplayName(userId: string): string | undefined {
  if (typeof window === "undefined" || !userId) return undefined;
  const scoped = window.localStorage.getItem(displayNameStorageKey(userId))?.trim();
  if (scoped) return scoped;

  const legacy = window.localStorage.getItem(LEGACY_DISPLAY_NAME_KEY)?.trim();
  if (legacy) {
    window.localStorage.setItem(displayNameStorageKey(userId), legacy);
    window.localStorage.removeItem(LEGACY_DISPLAY_NAME_KEY);
    return legacy;
  }
  return undefined;
}

export function writeStoredDisplayName(userId: string, name: string): void {
  if (typeof window === "undefined" || !userId) return;
  const trimmed = name.trim();
  if (!trimmed) return;
  window.localStorage.setItem(displayNameStorageKey(userId), trimmed);
}
