"use client";

import { useEffect } from "react";
import {
  applyAccentTheme,
  applyThemeMode,
  getStoredAccentTheme,
  getStoredThemeMode,
} from "@/lib/theme";

/**
 * Applies stored theme (mode + accent) on mount so preferences persist across refresh
 * without requiring the user to open the profile menu.
 */
export function ThemeSync() {
  useEffect(() => {
    const syncSystemTheme = () => applyThemeMode(getStoredThemeMode());
    syncSystemTheme();
    applyAccentTheme(getStoredAccentTheme());
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", syncSystemTheme);
    return () => media.removeEventListener("change", syncSystemTheme);
  }, []);
  return null;
}
