"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";

import { INTRO_SEEN_KEY } from "@/lib/onboardingStorage";

const INTRO_DURATION_MS = 2200;
const INTRO_OUT_MS = 450;

export function IntroSplash() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<"init" | "show" | "exiting" | "done">("init");
  const [mounted, setMounted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const outRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (phase === "done" || phase === "init" || !mounted) return null;

  const splash = (
    <div
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-gradient-to-b from-[#eef6e6] via-white to-prove-100/50 dark:from-[#050a18] dark:via-[#050a18] dark:to-[#0a1428] ${
        phase === "exiting" ? "animate-intro-out" : ""
      }`}
      style={{
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        minHeight: "100dvh",
        height: "100dvh",
      }}
      aria-hidden
    >
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="relative animate-intro-logo">
          <div
            className="absolute inset-0 scale-150 rounded-full bg-prove-400/30 blur-2xl animate-intro-glow"
            aria-hidden
          />
          {/* Real brand mark — only allowed on splash + homescreen/PWA icons */}
          <img
            src="/icon.png"
            alt=""
            width={96}
            height={96}
            className="relative h-24 w-24 rounded-[1.35rem] shadow-lg"
            draggable={false}
          />
        </div>
        <span
          className="font-display text-2xl font-black tracking-tight text-prove-700 dark:text-prove-400 animate-intro-text"
          aria-hidden
        >
          Proveit
        </span>
      </div>
    </div>
  );

  return createPortal(splash, document.body);
}
