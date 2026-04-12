"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useLayoutEffect, useState, type CSSProperties } from "react";
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
    title: "Get AI photo ideas",
    body: "Tap the button — AI suggests a few photo prompts from your title. You’ll pick one next.",
  },
  "goal-proof-pick": {
    title: "Choose how you’ll prove it",
    body: "Pick one of the AI-generated prompts (tap another option if you prefer).",
  },
  "goal-schedule": {
    title: "Rhythm & reminders",
    body: "Choose how many times per week you want to check in (1–7). We space due days for you. Set your daily reminder time — you’ll get a nudge every day.",
  },
  "goal-submit": {
    title: "Add it to your garden",
    body: "Optionally pick a plant style, then tap Add goal to save.",
  },
};

const HOLE_PAD = 8;
const DEFAULT_HOLE_RADIUS = 16;

export type HoleMetrics = {
  top: number;
  left: number;
  right: number;
  bottom: number;
  /** Matches target UI rounding so the dimmer cutout aligns with the ring (no sharp-corner leaks). */
  radius: number;
};

function readHoleRadiusPx(el: HTMLElement): number {
  const s = getComputedStyle(el);
  const raw = s.borderTopLeftRadius || "0";
  const px = parseFloat(raw);
  if (Number.isFinite(px) && px > 0) return px;
  return DEFAULT_HOLE_RADIUS;
}

function holeMetricsFromEl(el: HTMLElement): HoleMetrics {
  const r = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const top = Math.max(0, r.top - HOLE_PAD);
  const left = Math.max(0, r.left - HOLE_PAD);
  const right = Math.min(vw, r.right + HOLE_PAD);
  const bottom = Math.min(vh, r.bottom + HOLE_PAD);
  const w = right - left;
  const h = bottom - top;
  const desired = readHoleRadiusPx(el);
  const radius = Math.min(Math.max(desired, 4), w / 2, h / 2);
  return { top, left, right, bottom, radius };
}

/** Even-odd path: full viewport minus rounded-rect hole (same winding as typical “donut” overlays). */
function dimmerPathWithRoundedHole(
  vw: number,
  vh: number,
  left: number,
  top: number,
  right: number,
  bottom: number,
  rr: number
): string {
  const l = left;
  const t = top;
  const ri = right;
  const b = bottom;
  const outer = `M 0 0 L ${vw} 0 L ${vw} ${vh} L 0 ${vh} Z`;
  const inner = `M ${l + rr} ${t} L ${ri - rr} ${t} A ${rr} ${rr} 0 0 1 ${ri} ${t + rr} L ${ri} ${b - rr} A ${rr} ${rr} 0 0 1 ${ri - rr} ${b} L ${l + rr} ${b} A ${rr} ${rr} 0 0 1 ${l} ${b - rr} L ${l} ${t + rr} A ${rr} ${rr} 0 0 1 ${l + rr} ${t} Z`;
  return `${outer} ${inner}`;
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
  const maskUid = useId().replace(/\W/g, "");
  const [phase, setPhase] = useState<string | null>(null);
  const [hole, setHole] = useState<HoleMetrics | null>(null);
  const [viewport, setViewport] = useState(() =>
    typeof window !== "undefined"
      ? { w: window.innerWidth, h: window.innerHeight }
      : { w: 390, h: 640 }
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
    const u = () =>
      setViewport({ w: window.innerWidth, h: window.innerHeight });
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
      setHole(null);
      return;
    }
    const el = document.querySelector(SELECTORS[activePhase]) as HTMLElement | null;
    if (!el) {
      setHole(null);
      return;
    }
    const update = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
      setHole(holeMetricsFromEl(el));
    };

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

  if (!activePhase || !hole) return null;

  const { top, left, right, bottom, radius: holeRadius } = hole;
  const { w: vw, h: vh } = viewport;
  const maskId = `proveit-tour-spot-${maskUid}`;
  const holeW = right - left;
  const holeH = bottom - top;

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
      <svg
        className="fixed inset-0 z-[95] h-full w-full touch-none"
        width={vw}
        height={vh}
        viewBox={`0 0 ${vw} ${vh}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <mask
            id={maskId}
            maskUnits="userSpaceOnUse"
            x={0}
            y={0}
            width={vw}
            height={vh}
          >
            <rect width={vw} height={vh} fill="white" />
            <rect
              x={left}
              y={top}
              width={holeW}
              height={holeH}
              rx={holeRadius}
              ry={holeRadius}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width={vw}
          height={vh}
          mask={`url(#${maskId})`}
          className="pointer-events-auto fill-black/35 dark:fill-black/45"
        />
      </svg>

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
        className="pointer-events-none fixed z-[97] ring-2 ring-prove-500 ring-offset-2 ring-offset-transparent dark:ring-prove-400"
        style={{
          top,
          left,
          width: right - left,
          height: bottom - top,
          borderRadius: holeRadius,
          boxSizing: "border-box",
        }}
        aria-hidden
      />
    </div>
  );
}
