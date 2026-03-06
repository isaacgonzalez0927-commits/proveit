/**
 * Light haptic feedback. Uses Vibration API (web/Android) or Capacitor Haptics when available.
 */
export function lightImpact(): void {
  if (typeof window === "undefined") return;
  try {
    if ("vibrate" in navigator) {
      navigator.vibrate(10);
    }
  } catch {
    // ignore
  }
}

/**
 * Slightly stronger feedback for success (e.g. proof verified).
 */
export function success(): void {
  if (typeof window === "undefined") return;
  try {
    if ("vibrate" in navigator) {
      navigator.vibrate([12, 50, 12]);
    }
  } catch {
    // ignore
  }
}
