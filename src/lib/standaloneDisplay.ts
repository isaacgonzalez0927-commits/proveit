const DISMISS_KEY = "proveit_fullscreen_hint_dismissed";

export function isFullscreenHintDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissFullscreenHint(): void {
  try {
    window.localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return cap?.isNativePlatform?.() === true;
}

/** True when running without Safari/Chrome browser toolbars (home screen or native app). */
export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  if (isCapacitorNative()) return true;
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches
  );
}

export function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|Chrome|Chromium/.test(ua);
  return isIos && isSafari;
}

export function canRequestElementFullscreen(): boolean {
  if (typeof document === "undefined") return false;
  const el = document.documentElement as HTMLElement & { requestFullscreen?: () => Promise<void> };
  return typeof el.requestFullscreen === "function";
}

export async function tryBrowserFullscreen(): Promise<boolean> {
  if (!canRequestElementFullscreen()) return false;
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return true;
    }
    await document.documentElement.requestFullscreen();
    return true;
  } catch {
    return false;
  }
}
