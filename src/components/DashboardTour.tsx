"use client";

import { useEffect, useState } from "react";

type TourStep = 0 | 1 | 2 | 3;

const START_KEY = "proveit_start_tour";
const DONE_KEY = "proveit_tour_done";

export function DashboardTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<TourStep>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const shouldStart = window.localStorage.getItem(START_KEY);
    const done = window.localStorage.getItem(DONE_KEY);
    if (shouldStart && !done) {
      setOpen(true);
    }
  }, []);

  const finish = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DONE_KEY, "1");
      window.localStorage.removeItem(START_KEY);
    }
    setOpen(false);
  };

  const skip = () => {
    finish();
  };

  const next = () => {
    setStep((prev) => (prev < 3 ? ((prev + 1) as TourStep) : prev));
  };

  const prev = () => {
    setStep((prev) => (prev > 0 ? ((prev - 1) as TourStep) : prev));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-4 text-sm shadow-xl dark:bg-slate-900">
        {step === 0 && (
          <>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Step 1 of 4
            </p>
            <p className="mt-2 text-4xl" role="img" aria-label="Baby buddy">👶</p>
            <h2 className="mt-2 font-display text-lg font-bold text-slate-900 dark:text-white">
              Meet your accountability buddy
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Your buddy grows with your streak! Complete goals to evolve them from baby into a champion.
              Visit the Buddy tab to see them grow. They&apos;ll cheer you on every step of the way.
            </p>
          </>
        )}
        {step === 1 && (
          <>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Step 2 of 4
            </p>
            <h2 className="mt-2 font-display text-lg font-bold text-slate-900 dark:text-white">
              This is your dashboard
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              See your buddy, current streak, today&apos;s goals, and your weekly recap.
            </p>
          </>
        )}
        {step === 2 && (
          <>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Step 3 of 4
            </p>
            <h2 className="mt-2 font-display text-lg font-bold text-slate-900 dark:text-white">
              Add and manage goals
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Use the Goals tab in the top bar to add daily or weekly goals, edit them, or delete
              ones you don&apos;t need.
            </p>
          </>
        )}
        {step === 3 && (
          <>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Step 4 of 4
            </p>
            <h2 className="mt-2 font-display text-lg font-bold text-slate-900 dark:text-white">
              Prove it with photos
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              When you complete a goal, tap <span className="font-semibold">Mark done</span> or{" "}
              <span className="font-semibold">Submit proof</span> to take a photo and let AI verify it.
            </p>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              You can always upgrade or change your plan from the Pricing tab.
            </p>
          </>
        )}

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={skip}
            className="text-xs text-slate-500 underline-offset-2 hover:underline dark:text-slate-400"
          >
            Skip
          </button>
          <div className="flex items-center gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i as TourStep)}
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
            {step < 3 ? (
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

