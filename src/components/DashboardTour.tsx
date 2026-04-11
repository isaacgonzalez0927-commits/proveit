"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const START_KEY = "proveit_start_tour";
const DONE_KEY = "proveit_tour_done";
const GARDEN_HINT_KEY = "proveit_tour_garden_hint";
const RESUME_KEY = "proveit_tour_resume_step";
const TOUR_VERSION = "3";

interface TourStep {
  title: string;
  body: string;
  note: string;
  emoji?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to Proveit",
    emoji: "🌱",
    body:
      "You’ve picked your plan. Next you’ll add goals, choose a plant style for each one, and grow your garden with real proof photos.",
    note: "Use the bottom tabs to move between Home, Garden, Gallery, and Plan.",
  },
  {
    title: "Goal Garden",
    body:
      "The Goal Garden tab is your hub: create goals, set reminder days and times, and pick how each plant looks when it’s fully grown.",
    note: "Tap Next, then we’ll open the Garden for your first goal.",
  },
  {
    title: "Create your first goal",
    body:
      "Name something you can prove with a picture. Tap Get photo ideas, pick one of the AI suggestions, then set days (or Every day) and reminder time before adding the goal.",
    note: "Plant style only changes the final full-grown look — growth path stays the same.",
  },
  {
    title: "Prove it with a photo",
    body:
      "When a goal is due, tap Prove it and take a photo. Verification keeps things honest and waters that goal’s plant.",
    note: "Submit inside the due window to protect your streak.",
  },
  {
    title: "Watch the garden grow",
    body:
      "Each goal is its own plant card: streak, growth stage, and whether it’s watered this cycle — all in one place.",
    note: "Hit your reminder days consistently to keep streaks and stages moving.",
  },
  {
    title: "Home dashboard",
    body:
      "Home shows momentum at a glance: what’s due, what’s done, and quick actions so nothing slips.",
    note: "Check Home in the morning to see what needs attention today.",
  },
  {
    title: "Gallery & plan",
    body:
      "Gallery is your proof history. Plan is where you upgrade when you need more goals or features.",
    note: "You’re set. Build the habit, water your plants, and keep proving it.",
  },
] as const;

export function DashboardTour() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const shouldStart = window.localStorage.getItem(START_KEY);
    const done = window.localStorage.getItem(DONE_KEY);
    const resume = window.localStorage.getItem(RESUME_KEY);
    if (done === TOUR_VERSION) return;
    if (resume) {
      const idx = Number.parseInt(resume, 10);
      setStep(Number.isFinite(idx) && idx >= 0 && idx < TOUR_STEPS.length ? idx : 0);
      setOpen(true);
    } else if (shouldStart) {
      setStep(0);
      setOpen(true);
    }
  }, []);

  const finish = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DONE_KEY, TOUR_VERSION);
      window.localStorage.removeItem(START_KEY);
      window.localStorage.removeItem(GARDEN_HINT_KEY);
      window.localStorage.removeItem(RESUME_KEY);
    }
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
        window.localStorage.setItem(GARDEN_HINT_KEY, TOUR_VERSION);
        window.localStorage.setItem(RESUME_KEY, "4");
      }
      setOpen(false);
      router.push("/buddy");
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-12 backdrop-blur-sm sm:items-center sm:pb-8 dark:bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl dark:border-slate-600/40 dark:bg-slate-900">
        <div
          className="h-1 bg-gradient-to-r from-prove-500 via-emerald-500 to-teal-500"
          style={{ width: `${progress}%` }}
          aria-hidden
        />
        <div className="p-6 sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-prove-600 dark:text-prove-400">
              Quick tour · {step + 1} / {stepCount}
            </p>
            {activeStep.emoji && (
              <span className="text-3xl leading-none" role="img" aria-hidden>
                {activeStep.emoji}
              </span>
            )}
          </div>

          <h2
            id="tour-title"
            className="mt-3 font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl"
          >
            {activeStep.title}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {activeStep.body}
          </p>
          <p className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/90 px-3 py-2.5 text-xs leading-relaxed text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
            {activeStep.note}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {TOUR_STEPS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i)}
                className={`h-2 rounded-full transition-all ${
                  step === i ? "w-8 bg-prove-600 dark:bg-prove-400" : "w-2 bg-slate-200 dark:bg-slate-600"
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
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={handleNextOrFinish}
                className="rounded-full bg-prove-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-prove-600/25 hover:bg-prove-700 focus:outline-none focus:ring-2 focus:ring-prove-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
              >
                {step < TOUR_STEPS.length - 1 ? "Next" : "Done"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
