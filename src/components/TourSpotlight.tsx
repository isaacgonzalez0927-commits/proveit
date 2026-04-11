"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useState, type CSSProperties } from "react";
import { useApp } from "@/context/AppContext";
import {
  TOUR_CHANGED_EVENT,
  TOUR_SPOTLIGHT_KEY,
  completeDashboardTour,
  dispatchTourChanged,
  type TourSpotlightPhase,
} from "@/lib/tourStorage";

const SELECTORS: Record<TourSpotlightPhase, string> = {
  "garden-tab": '[data-tour="garden-tab"]',
  "add-goal-button": '[data-tour="add-goal-button"]',
  "goal-title": '[data-tour="goal-title"]',
  "goal-proof-fetch": '[data-tour="goal-proof-fetch"]',
  "goal-proof-pick": '[data-tour="goal-proof-pick"]',
  "goal-schedule": '[data-tour="goal-schedule"]',
  "goal-submit": '[data-tour="goal-submit"]',
};

const COPY: Record<TourSpotlightPhase, { title: string; body: string }> = {
  "garden-tab": {
    title: "Open Goal Garden",
    body: "Tap the Goal Garden tab below to manage goals and add your first one.",
  },
  "add-goal-button": {
    title: "Add your first goal",
    body: "Tap Add goal in garden to open the form.",
  },
  "goal-title": {
    title: "Name your goal",
    body: "Type something you can prove with a photo (at least 2 characters). Optional description is below.",
  },
  "goal-proof-fetch": {
    title: "Get photo ideas",
    body: "Tap Get photo ideas. We’ll suggest a few prompts; you’ll pick one next.",
  },
  "goal-proof-pick": {
    title: "Choose how you’ll prove it",
    body: "Select one of the suggested photo prompts (tap a different option if you prefer).",
  },
  "goal-schedule": {
    title: "When to remind you",
    body: "Pick at least one day (or Every day), set reminder time, and adjust “Prove it within” if you like.",
  },
  "goal-submit": {
    title: "Add it to your garden",
    body: "Optionally pick a plant style, then tap Add goal to save.",
  },
};

const HOLE_PAD = 8;

function holeFromEl(el: HTMLElement): { top: number; left: number; right: number; bottom: number } {
  const r = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return {
    top: Math.max(0, r.top - HOLE_PAD),
    left: Math.max(0, r.left - HOLE_PAD),
    right: Math.min(vw, r.right + HOLE_PAD),
    bottom: Math.min(vh, r.bottom + HOLE_PAD),
  };
}

function resolveActivePhase(phase: string | null, pathname: string): TourSpotlightPhase | null {
  if (!phase) return null;
  if (phase === "garden-tab" && pathname === "/dashboard") return "garden-tab";
  if (!pathname.startsWith("/buddy")) return null;
  const allowed: TourSpotlightPhase[] = [
    "add-goal-button",
    "goal-title",
    "goal-proof-fetch",
    "goal-proof-pick",
    "goal-schedule",
    "goal-submit",
  ];
  return allowed.includes(phase as TourSpotlightPhase) ? (phase as TourSpotlightPhase) : null;
}

const SCROLL_INTO_VIEW_PHASES: TourSpotlightPhase[] = [
  "add-goal-button",
  "goal-title",
  "goal-proof-fetch",
  "goal-proof-pick",
  "goal-schedule",
  "goal-submit",
];

export function TourSpotlight() {
  const { user } = useApp();
  const pathname = usePathname();
  const [phase, setPhase] = useState<string | null>(null);
  const [rect, setRect] = useState<{ top: number; left: number; right: number; bottom: number } | null>(
    null
  );
  const [vh, setVh] = useState(() =>
    typeof window !== "undefined" ? window.innerHeight : 640
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
    const u = () => setVh(window.innerHeight);
    u();
    window.addEventListener("resize", u);
    return () => window.removeEventListener("resize", u);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!pathname.startsWith("/buddy")) return;
    const s = window.localStorage.getItem(TOUR_SPOTLIGHT_KEY);
    if (s === "garden-tab") {
      window.localStorage.setItem(TOUR_SPOTLIGHT_KEY, "add-goal-button");
      dispatchTourChanged();
    }
  }, [pathname]);

  const activePhase = resolveActivePhase(phase, pathname);

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

    if (SCROLL_INTO_VIEW_PHASES.includes(activePhase)) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      requestAnimationFrame(() => {
        update();
        window.setTimeout(update, 320);
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
    "fixed z-[95] bg-black/35 pointer-events-auto dark:bg-black/45";

  const text = COPY[activePhase];
  const midY = (top + bottom) / 2;
  const cardAboveTarget = midY > vh * 0.38;

  const cardPositionStyle: CSSProperties = cardAboveTarget
    ? {
        left: "50%",
        transform: "translateX(-50%)",
        bottom: Math.max(12, vh - top + 14),
      }
    : {
        left: "50%",
        transform: "translateX(-50%)",
        top: Math.min(vh - 120, bottom + 14),
      };

  return (
    <div className="pointer-events-none fixed inset-0 z-[94]" aria-hidden={false}>
      <div className={panelClass} style={{ top: 0, left: 0, right: 0, height: top }} />
      <div className={panelClass} style={{ top: bottom, left: 0, right: 0, bottom: 0 }} />
      <div className={panelClass} style={{ top, left: 0, width: left, height: bottom - top }} />
      <div className={panelClass} style={{ top, left: right, right: 0, height: bottom - top }} />

      <div
        className="pointer-events-auto fixed z-[96] w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-600 dark:bg-slate-900"
        style={{
          ...cardPositionStyle,
          maxHeight: "min(44vh, 15rem)",
        }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-prove-600 dark:text-prove-400">
          Guided step
        </p>
        <p className="mt-1.5 font-display text-base font-bold text-slate-900 dark:text-white">{text.title}</p>
        <p className="mt-1 text-sm leading-snug text-slate-600 dark:text-slate-300">{text.body}</p>
        <button
          type="button"
          onClick={() => completeDashboardTour(user?.id)}
          className="mt-3 text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline dark:text-slate-400 dark:hover:text-slate-200"
        >
          Skip tour
        </button>
      </div>

      <div
        className="pointer-events-none fixed z-[97] rounded-2xl ring-2 ring-prove-500 ring-offset-2 ring-offset-transparent dark:ring-prove-400"
        style={{
          top,
          left,
          width: right - left,
          height: bottom - top,
          boxSizing: "border-box",
        }}
        aria-hidden
      />
    </div>
  );
}
