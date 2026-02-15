import { useEffect, useState } from "react";
import { MoonStar, SunMedium } from "lucide-react";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "proveit-theme";

function getPreferredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  const root = document.documentElement;
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = theme === "dark" || (theme === "system" && systemPrefersDark);

  root.classList.toggle("dark", isDark);
}

function getEffectiveIsDark(theme: Theme): boolean {
  if (typeof window === "undefined") return false;
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return theme === "dark" || (theme === "system" && systemPrefersDark);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = getPreferredTheme();
    setTheme(initial);
    applyTheme(initial);
    setMounted(true);
  }, []);

  const handleClick = () => {
    const effectiveDark = getEffectiveIsDark(theme);
    const updated: Theme = effectiveDark ? "light" : "dark";
    setTheme(updated);
    window.localStorage.setItem(STORAGE_KEY, updated);
    applyTheme(updated);
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

