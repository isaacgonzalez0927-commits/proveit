"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";

const INTRO_SEEN_KEY = "proveit_intro_seen";
const INTRO_DURATION_MS = 2200;
const INTRO_OUT_MS = 450;

export function IntroSplash() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<"init" | "show" | "exiting" | "done">("init");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const outRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (pathname !== "/") {
      setPhase("done");
      return;
    }
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(INTRO_SEEN_KEY)) {
      setPhase("done");
      return;
    }
    setPhase("show");

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setPhase("exiting");
      outRef.current = setTimeout(() => {
        outRef.current = null;
        try {
          window.localStorage.setItem(INTRO_SEEN_KEY, "1");
        } catch {
          /* ignore */
        }
        setPhase("done");
      }, INTRO_OUT_MS);
    }, INTRO_DURATION_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (outRef.current) clearTimeout(outRef.current);
    };
  }, [pathname]);

  if (phase === "done" || phase === "init") return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 via-white to-prove-50/40 dark:from-slate-950 dark:via-slate-950 dark:to-prove-950/30 ${
        phase === "exiting" ? "animate-intro-out" : ""
      }`}
      aria-hidden
    >
      {/* Soft pulsing glow behind logo */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        aria-hidden
      >
        <div
          className="h-48 w-48 rounded-full bg-prove-400/30 dark:bg-prove-500/20 blur-3xl animate-intro-glow"
          aria-hidden
        />
      </div>
      <div className="relative z-10 flex flex-col items-center gap-4">
        <span
          className="proveit-mark h-20 w-20 shrink-0 animate-intro-logo"
          role="img"
          aria-hidden
        />
        <span
          className="font-display text-2xl font-bold tracking-tight text-prove-600 dark:text-prove-300 animate-intro-text"
          aria-hidden
        >
          Proveit
        </span>
      </div>
    </div>
  );
}
