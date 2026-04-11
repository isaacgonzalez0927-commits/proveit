"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
  TOUR_CHANGED_EVENT,
  TOUR_SPOTLIGHT_KEY,
  dispatchTourChanged,
  type TourSpotlightPhase,
} from "@/lib/tourStorage";

const DONE_KEY = "proveit_tour_done";
const GARDEN_HINT_KEY = "proveit_tour_garden_hint";
const RESUME_KEY = "proveit_tour_resume_step";
const START_KEY = "proveit_start_tour";
const TOUR_VERSION = "3";

const SELECTORS: Record<TourSpotlightPhase, string> = {
  "garden-tab": '[data-tour="garden-tab"]',
  "add-goal-button": '[data-tour="add-goal-button"]',
};

const COPY: Record<TourSpotlightPhase, { title: string; body: string }> = {
  "garden-tab": {
    title: "Open Goal Garden",
    body: "Tap the Goal Garden tab below to manage goals and add your first one.",
  },
  "add-goal-button": {
    title: "Add your first goal",
    body: "Tap Add goal in garden, then fill in the form (photo ideas, days, time).",
  },
};

function clearSpotlightAndGardenHint() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOUR_SPOTLIGHT_KEY);
  window.localStorage.removeItem(GARDEN_HINT_KEY);
}

function skipEntireTour() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DONE_KEY, TOUR_VERSION);
  window.localStorage.removeItem(START_KEY);
  window.localStorage.removeItem(RESUME_KEY);
  clearSpotlightAndGardenHint();
  dispatchTourChanged();
}

export function TourSpotlight() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<string | null>(null);
  const [rect, setRect] = useState<{ top: number; left: number; right: number; bottom: number } | null>(
    null
  );
  const [vh, setVh] = useState(0);

  const readPhase = useCallback(() => {
    if (typeof window === "undefined") return;
    setPhase(window.localStorage.getItem(TOUR_SPOTLIGHT_KEY));
  }, []);

  useEffect(() => {
    readPhase();
    window.addEventListener(TOUR_CHANGED_EVENT, readPhase);
    return () => window.removeEventListener(TOUR_CHANGED_EVENT, readPhase);
  }, [readPhase]);

  useEffect(() => {
    const u = () => setVh(window.innerHeight);
    u();
    window.addEventListener("resize", u);
    return () => window.removeEventListener("resize", u);
  }, []);

  // Landed on Garden: move spotlight from tab → Add goal button
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!pathname.startsWith("/buddy")) return;
    const s = window.localStorage.getItem(TOUR_SPOTLIGHT_KEY);
    if (s === "garden-tab") {
      window.localStorage.setItem(TOUR_SPOTLIGHT_KEY, "add-goal-button");
      dispatchTourChanged();
    }
  }, [pathname]);

  const activePhase: TourSpotlightPhase | null =
    phase === "garden-tab" && pathname === "/dashboard"
      ? "garden-tab"
      : phase === "add-goal-button" && pathname.startsWith("/buddy")
        ? "add-goal-button"
        : null;

  useLayoutEffect(() => {
    if (!activePhase) {
      setRect(null);
      return;
    }
    const el = document.querySelector(SELECTORS[activePhase]) as HTMLElement | null;
    if (!el) {
      setRect(null);
      return;
    }
    const update = () => {
      const r = el.getBoundingClientRect();
      const pad = 10;
      setRect({
        top: Math.max(0, r.top - pad),
        left: Math.max(0, r.left - pad),
        right: r.right + pad,
        bottom: r.bottom + pad,
      });
    };
    if (activePhase === "add-goal-button") {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [activePhase]);

  if (!activePhase || !rect) return null;

  const { top, left, right, bottom } = rect;
  const panelClass =
    "fixed z-[95] bg-slate-950/70 backdrop-blur-md dark:bg-black/75 pointer-events-auto";

  const text = COPY[activePhase];

  return (
    <div className="pointer-events-none fixed inset-0 z-[94]" aria-hidden={false}>
      {/* Top */}
      <div className={panelClass} style={{ top: 0, left: 0, right: 0, height: top }} />
      {/* Bottom */}
      <div className={panelClass} style={{ top: bottom, left: 0, right: 0, bottom: 0 }} />
      {/* Left */}
      <div className={panelClass} style={{ top, left: 0, width: left, height: bottom - top }} />
      {/* Right */}
      <div className={panelClass} style={{ top, left: right, right: 0, height: bottom - top }} />

      <div
        className="pointer-events-auto fixed z-[96] max-w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-white/20 bg-white/95 p-4 shadow-2xl dark:border-slate-600/50 dark:bg-slate-900/95"
        style={{
          left: "50%",
          transform: "translateX(-50%)",
          bottom: vh > 0 ? Math.max(100, vh - top + 16) : "6rem",
        }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-prove-600 dark:text-prove-400">
          Guided step
        </p>
        <p className="mt-2 font-display text-lg font-bold text-slate-900 dark:text-white">{text.title}</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{text.body}</p>
        <button
          type="button"
          onClick={skipEntireTour}
          className="mt-4 text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline dark:text-slate-400 dark:hover:text-slate-200"
        >
          Skip tour
        </button>
      </div>

      <div
        className="pointer-events-none fixed z-[97] rounded-xl ring-4 ring-prove-500 ring-offset-2 ring-offset-slate-950/0 dark:ring-prove-400"
        style={{
          top,
          left,
          width: right - left,
          height: bottom - top,
        }}
        aria-hidden
      />
    </div>
  );
}
