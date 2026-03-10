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
      "You just picked your plan. Next you will set goals, choose each goal's plant style, and start building your garden.",
    note: "Quick tip: use the bottom tabs to move between Home, Garden, Gallery, and Plan.",
  },
  {
    title: "Goal Garden",
    body:
      "Look at the bottom bar — the Goal Garden tab is where you manage your goals, reminders, and plant styles.",
    note: "Tap Next to see how to create your first goal.",
  },
  {
    title: "Create your first goal",
    body:
      "First, give your goal a name that can be proven with a picture. Then choose reminder days and a time.",
    note: "Plant style changes the final full-grown look.",
  },
  {
    title: "Complete goals with proof photos",
    body:
      "When a goal is due, tap Prove it and take a photo. AI verifies it and waters that goal's plant.",
    note: "Stay inside the due window to protect your streak.",
  },
  {
    title: "Grow your Garden",
    body:
      "The Garden tab shows every goal as its own plant card with streak, stage, and watering status.",
    note: "Submit proof on your chosen days to keep your streak.",
  },
  {
    title: "Track progress from Home",
    body:
      "Dashboard shows your overall momentum: due goals, completed goals, streak pressure, and quick actions.",
    note: "Use Home stats to quickly spot what needs attention today.",
  },
  {
    title: "Use Gallery + Plan tools",
    body:
      "Gallery helps you review past proofs, and Plan lets you change limits/features when you need more room.",
    note: "You're ready. Build consistency, water your plants, and keep proving it.",
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
    // Step 1: just point to Goal Garden (stay on dashboard); step 2: then take them there.
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 px-4 backdrop-blur-md dark:bg-black/30">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-slate-900 p-4 text-sm shadow-xl dark:border-slate-700">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-300">
          Step {step + 1} of {stepCount}
        </p>
        {activeStep.emoji && (
          <p className="mt-2 text-4xl" role="img" aria-label="Tour icon">
            {activeStep.emoji}
          </p>
        )}
        <h2 className="mt-2 font-display text-lg font-bold text-white">
          {activeStep.title}
        </h2>
        <p className="mt-2 text-slate-200">{activeStep.body}</p>
        <p className="mt-3 text-xs text-slate-400">{activeStep.note}</p>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={skip}
            className="text-xs text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
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
                  step === i ? "w-4 bg-white" : "w-2 bg-white/30"
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
                className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:bg-slate-700"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={handleNextOrFinish}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-100"
            >
              {step < TOUR_STEPS.length - 1 ? "Next" : "Finish"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

