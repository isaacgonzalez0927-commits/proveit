import { useEffect, useState } from "react";
import { MoonStar, SunMedium } from "lucide-react";
import { useApp } from "@/context/AppContext";
import {
  applyAccentTheme,
  applyThemeMode,
  getEffectiveIsDark,
  getStoredAccentTheme,
  getStoredThemeMode,
  saveAndApplyAccentTheme,
  saveAndApplyThemeMode,
  sanitizeAccentThemeForPlan,
  type ThemeMode,
} from "@/lib/theme";

export function ThemeToggle() {
  const { user } = useApp();
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = getStoredThemeMode();
    setTheme(initial);
    applyThemeMode(initial);
    applyAccentTheme(getStoredAccentTheme());
    setMounted(true);
  }, []);

  useEffect(() => {
    const sanitizedAccent = sanitizeAccentThemeForPlan(getStoredAccentTheme(), user?.plan);
    saveAndApplyAccentTheme(sanitizedAccent);
  }, [user?.plan]);

  const handleClick = () => {
    const effectiveDark = getEffectiveIsDark(theme);
    const updated: ThemeMode = effectiveDark ? "light" : "dark";
    setTheme(updated);
    saveAndApplyThemeMode(updated);
  };

  const isDark = mounted && getEffectiveIsDark(theme);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white/70 text-slate-700 shadow-sm backdrop-blur-md transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:bg-slate-800"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
    </button>
  );
}

