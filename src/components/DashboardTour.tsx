"use client";

import { useEffect, useState } from "react";

const START_KEY = "proveit_start_tour";
const DONE_KEY = "proveit_tour_done";
const TOUR_VERSION = "2";

interface TourStep {
  title: string;
  body: string;
  note: string;
  emoji?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to ProveIt",
    emoji: "🌱",
    body:
      "You just picked your plan. Next you will set goals, choose each goal's plant style, and start building your garden.",
    note: "Quick tip: use the bottom tabs to move between Home, Garden, Goals, History, and Plan.",
  },
  {
    title: "Create a goal + choose plant style",
    body:
      "Open the Goals tab, tap Add goal, set daily or weekly timing, and choose Plant 1, 2, or 3 for that goal.",
    note: "Plant style matters most at stage 6 where each style has its own flower.",
  },
  {
    title: "Complete goals with proof photos",
    body:
      "When a goal is due, tap Submit proof and take a photo. AI verifies it and waters that goal's plant.",
    note: "Stay inside the due window to protect your streak.",
  },
  {
    title: "Grow your Garden",
    body:
      "The Garden tab shows every goal as its own plant card with streak, stage, and watering status.",
    note: "Daily goals track day streaks, weekly goals track week streaks.",
  },
  {
    title: "Track progress from Home",
    body:
      "Dashboard shows your overall momentum: due goals, completed goals, streak pressure, and quick actions.",
    note: "Use Creator Tools and Developer Mode (creator account only) to test states quickly.",
  },
  {
    title: "Use History + Plan tools",
    body:
      "History helps you audit past proofs, and Plan lets you change limits/features when you need more room.",
    note: "You're ready. Build consistency, water your plants, and keep proving it.",
  },
] as const;

export function DashboardTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const shouldStart = window.localStorage.getItem(START_KEY);
    const done = window.localStorage.getItem(DONE_KEY);
    if (shouldStart && done !== TOUR_VERSION) {
      setOpen(true);
    }
  }, []);

  const finish = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DONE_KEY, TOUR_VERSION);
      window.localStorage.removeItem(START_KEY);
    }
    setOpen(false);
  };

  const skip = () => {
    finish();
  };

  const next = () => {
    setStep((prev) => (prev < TOUR_STEPS.length - 1 ? prev + 1 : prev));
  };

  const prev = () => {
    setStep((prev) => (prev > 0 ? prev - 1 : prev));
  };

  if (!open) return null;

  const activeStep = TOUR_STEPS[step];
  const stepCount = TOUR_STEPS.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-4 text-sm shadow-xl dark:bg-slate-900">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Step {step + 1} of {stepCount}
        </p>
        {activeStep.emoji && (
          <p className="mt-2 text-4xl" role="img" aria-label="Tour icon">
            {activeStep.emoji}
          </p>
        )}
        <h2 className="mt-2 font-display text-lg font-bold text-slate-900 dark:text-white">
          {activeStep.title}
        </h2>
        <p className="mt-2 text-slate-600 dark:text-slate-400">{activeStep.body}</p>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{activeStep.note}</p>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={skip}
            className="text-xs text-slate-500 underline-offset-2 hover:underline dark:text-slate-400"
          >
            Skip
          </button>
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i)}
                className={`h-1.5 rounded-full ${
                  step === i ? "w-4 bg-slate-900 dark:bg-white" : "w-2 bg-slate-300 dark:bg-slate-700"
                }`}
                aria-label={`Go to tour step ${i + 1}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={prev}
                className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Back
              </button>
            )}
            {step < TOUR_STEPS.length - 1 ? (
              <button
                type="button"
                onClick={next}
                className="rounded-full bg-black px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900 dark:bg-white dark:text-black dark:hover:bg-slate-200"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={finish}
                className="rounded-full bg-black px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900 dark:bg-white dark:text-black dark:hover:bg-slate-200"
              >
                Finish
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

