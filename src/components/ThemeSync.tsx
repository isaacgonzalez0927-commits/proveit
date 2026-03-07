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
    applyThemeMode(getStoredThemeMode());
    applyAccentTheme(getStoredAccentTheme());
  }, []);
  return null;
}
