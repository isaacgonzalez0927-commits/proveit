"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Camera,
  Flower2,
  Images,
  LayoutDashboard,
  PlusCircle,
  Sparkles,
  Sprout,
  Trees,
  type LucideIcon,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import {
  completeDashboardTour,
  dispatchTourChanged,
  TOUR_CHANGED_EVENT,
  TOUR_DONE_KEY,
  TOUR_DONE_VERSION,
  TOUR_GARDEN_HINT_KEY,
  TOUR_RESUME_KEY,
  TOUR_SPOTLIGHT_KEY,
  TOUR_START_KEY,
} from "@/lib/tourStorage";

interface TourStep {
  title: string;
  body: string;
  note: string;
  icon: LucideIcon;
  accent: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to Proveit",
    icon: Sprout,
    accent: "from-emerald-500/20 via-prove-500/15 to-teal-500/10",
    body:
      "You’ll add goals, pick a plant for each one, and grow your garden with real proof photos. This quick tour shows where everything lives.",
    note: "Use the bottom tabs to move between Home, Garden, Gallery, and Plan.",
  },
  {
    title: "Goal Garden",
    icon: Trees,
    accent: "from-prove-600/25 via-emerald-600/15 to-slate-900/5",
    body:
      "The Goal Garden tab is your hub: create goals, set weekly check-ins, daily reminders, and how each plant looks when it’s fully grown.",
    note: "Tap Next — we’ll guide you to open the Garden from the tab bar.",
  },
  {
    title: "Create your first goal",
    icon: PlusCircle,
    accent: "from-sky-500/20 via-prove-500/15 to-emerald-500/10",
    body:
      "We’ll highlight the Goal Garden tab. Tap it, then Add goal in garden to open the form and set up your first habit.",
    note: "After that: AI photo ideas, pick a prompt, set your weekly rhythm, then save.",
  },
  {
    title: "Prove it with a photo",
    icon: Camera,
    accent: "from-amber-500/15 via-prove-500/20 to-emerald-600/10",
    body:
      "When you still owe a check-in for the week, tap Prove it and take a fresh photo. Verification keeps things honest and waters that goal’s plant.",
    note: "You choose which days — up to your weekly target, once per calendar day (Sun–Sat).",
  },
  {
    title: "Watch the garden grow",
    icon: Flower2,
    accent: "from-teal-500/20 via-emerald-500/15 to-prove-600/10",
    body:
      "Each goal is its own plant card: streak, growth stage, and whether it’s watered this cycle — all in one place.",
    note: "Hit weekly targets and prove consistently to keep streaks and stages moving.",
  },
  {
    title: "Home dashboard",
    icon: LayoutDashboard,
    accent: "from-prove-600/20 via-slate-500/10 to-emerald-500/15",
    body:
      "Home shows momentum at a glance: what needs a check-in today, what’s done, and quick actions so nothing slips.",
    note: "Check Home in the morning to see what needs attention today.",
  },
  {
    title: "Gallery & plan",
    icon: Images,
    accent: "from-violet-500/15 via-prove-500/15 to-emerald-500/10",
    body:
      "Gallery is your proof history. Plan is where you upgrade when you need more goals or features.",
    note: "You’re set. Build the habit, water your plants, and keep proving it.",
  },
];

function readShouldOpenTour(): { open: boolean; step: number } {
  if (typeof window === "undefined") return { open: false, step: 0 };
  const done = window.localStorage.getItem(TOUR_DONE_KEY);
  if (done === TOUR_DONE_VERSION) return { open: false, step: 0 };
  const resume = window.localStorage.getItem(TOUR_RESUME_KEY);
  if (resume) {
    const idx = Number.parseInt(resume, 10);
    return {
      open: true,
      step: Number.isFinite(idx) && idx >= 0 && idx < TOUR_STEPS.length ? idx : 0,
    };
  }
  if (window.localStorage.getItem(TOUR_START_KEY)) {
    return { open: true, step: 0 };
  }
  return { open: false, step: 0 };
}

export function DashboardTour() {
  const { user } = useApp();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const syncFromStorage = useCallback(() => {
    const next = readShouldOpenTour();
    setOpen(next.open);
    setStep(next.step);
  }, []);

  useEffect(() => {
    syncFromStorage();
    window.addEventListener(TOUR_CHANGED_EVENT, syncFromStorage);
    return () => window.removeEventListener(TOUR_CHANGED_EVENT, syncFromStorage);
  }, [syncFromStorage]);

  const finish = () => {
    completeDashboardTour(user?.id);
    setOpen(false);
  };

  const skip = () => {
    finish();
  };

  const handleNextOrFinish = () => {
    if (step === 1) {
      setStep(2);
      return;
    }
    if (step === 2) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(TOUR_GARDEN_HINT_KEY, TOUR_DONE_VERSION);
        window.localStorage.setItem(TOUR_SPOTLIGHT_KEY, "garden-tab");
        dispatchTourChanged();
      }
      setOpen(false);
      return;
    }
    if (step < TOUR_STEPS.length - 1) {
      setStep((prev) => prev + 1);
    } else {
      finish();
    }
  };

  const prev = () => {
    setStep((prev) => (prev > 0 ? prev - 1 : prev));
  };

  if (!open) return null;

  const activeStep = TOUR_STEPS[step];
  const stepCount = TOUR_STEPS.length;
  const progress = ((step + 1) / stepCount) * 100;
  const StepIcon = activeStep.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-12 backdrop-blur-md sm:items-center sm:pb-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-[1.75rem] border border-white/25 bg-white/95 shadow-2xl shadow-slate-950/30 dark:border-slate-600/35 dark:bg-slate-900/95">
        <div
          className={`pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-br ${activeStep.accent}`}
          aria-hidden
        />
        <div className="relative h-1.5 w-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-prove-500 via-emerald-500 to-teal-500 transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
            aria-hidden
          />
        </div>

        <div className="relative p-6 sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-prove-100/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-prove-800 dark:bg-prove-950/80 dark:text-prove-200">
                <Sparkles className="h-3 w-3" aria-hidden />
                Quick tour
              </span>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {step + 1} / {stepCount}
              </span>
            </div>
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-prove-500 to-emerald-600 text-white shadow-lg shadow-prove-600/30"
              aria-hidden
            >
              <StepIcon className="h-6 w-6" strokeWidth={2.25} />
            </span>
          </div>

          <h2
            id="tour-title"
            className="mt-4 font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white"
          >
            {activeStep.title}
          </h2>
          <p className="mt-2.5 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
            {activeStep.body}
          </p>
          <p className="mt-4 rounded-2xl border border-slate-200/90 bg-slate-50/95 px-3.5 py-3 text-xs leading-relaxed text-slate-600 dark:border-slate-700/80 dark:bg-slate-800/50 dark:text-slate-400">
            <span className="font-semibold text-prove-700 dark:text-prove-300">Tip · </span>
            {activeStep.note}
          </p>

          <div className="mt-6 flex items-center justify-center gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i)}
                className={`rounded-full transition-all duration-300 ${
                  step === i
                    ? "h-2 w-8 bg-gradient-to-r from-prove-600 to-emerald-500 dark:from-prove-400 dark:to-emerald-400"
                    : "h-2 w-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500"
                }`}
                aria-label={`Go to step ${i + 1}`}
                aria-current={step === i ? "step" : undefined}
              />
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
            <button
              type="button"
              onClick={skip}
              className="text-sm font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline dark:text-slate-400 dark:hover:text-slate-200"
            >
              Skip tour
            </button>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button
                  type="button"
                  onClick={prev}
                  className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={handleNextOrFinish}
                className="rounded-full bg-gradient-to-r from-prove-600 to-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-prove-600/30 hover:from-prove-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-prove-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
              >
                {step < TOUR_STEPS.length - 1 ? "Next" : "Let’s go"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
