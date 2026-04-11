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

/** Extra space around target so the cutout is a square centered on the element (reads as a circle with rounded-full ring). */
const HOLE_PADDING = 14;

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

/** Square hole centered on the target; ring is a true circle (rounded-full). Clamps to viewport. */
function holeFromEl(el: HTMLElement): { top: number; left: number; right: number; bottom: number } {
  const r = el.getBoundingClientRect();
  const cx = (r.left + r.right) / 2;
  const cy = (r.top + r.bottom) / 2;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let side = Math.max(r.width, r.height) + HOLE_PADDING * 2;
  side = Math.min(side, vw, vh);
  let left = cx - side / 2;
  let top = cy - side / 2;
  left = Math.max(0, Math.min(left, vw - side));
  top = Math.max(0, Math.min(top, vh - side));
  return { top, left, right: left + side, bottom: top + side };
}

export function TourSpotlight() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<string | null>(null);
  const [rect, setRect] = useState<{ top: number; left: number; right: number; bottom: number } | null>(
    null
  );

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
    const update = () => setRect(holeFromEl(el));

    if (activePhase === "add-goal-button") {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      requestAnimationFrame(() => {
        update();
        window.setTimeout(update, 280);
      });
    } else {
      update();
    }

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
    "fixed z-[95] bg-slate-900/40 pointer-events-auto dark:bg-slate-950/45";

  const text = COPY[activePhase];

  const side = right - left;
  const ringSize = Math.max(side, 0);

  return (
    <div className="pointer-events-none fixed inset-0 z-[94]" aria-hidden={false}>
      <div className={panelClass} style={{ top: 0, left: 0, right: 0, height: top }} />
      <div className={panelClass} style={{ top: bottom, left: 0, right: 0, bottom: 0 }} />
      <div className={panelClass} style={{ top, left: 0, width: left, height: bottom - top }} />
      <div className={panelClass} style={{ top, left: right, right: 0, height: bottom - top }} />

      {/* Instructions: fixed under header so they never sit inside the bottom-tab or mid-page hole */}
      <div
        className="pointer-events-auto fixed left-1/2 z-[96] w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-slate-200/90 bg-white/98 p-4 shadow-xl dark:border-slate-600/60 dark:bg-slate-900/98"
        style={{
          top: "max(5.5rem, calc(env(safe-area-inset-top, 0px) + 4.5rem))",
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

      {/* Circular ring centered on the same square hole */}
      <div
        className="pointer-events-none fixed z-[97] rounded-full border-[3px] border-prove-500 shadow-[0_0_0_4px_rgba(255,255,255,0.35)] dark:border-prove-400 dark:shadow-[0_0_0_4px_rgba(0,0,0,0.35)]"
        style={{
          top: top,
          left: left,
          width: ringSize,
          height: ringSize,
          boxSizing: "border-box",
        }}
        aria-hidden
      />
    </div>
  );
}
