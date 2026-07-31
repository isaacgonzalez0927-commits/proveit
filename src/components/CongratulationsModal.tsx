"use client";

import { useEffect } from "react";

type Variant = "first_goal" | "first_full_grown";

const CONTENT: Record<
  Variant,
  { title: string; message: string; emoji: string; buttonLabel: string }
> = {
  first_goal: {
    title: "Congratulations!",
    message: "You've planted your first goal. Water it by proving it — your plant will grow with every verified proof.",
    emoji: "🌱",
    buttonLabel: "Let's go",
  },
  first_full_grown: {
    title: "Your first plant is fully grown!",
    message: "You kept showing up and proved it. That plant reached the final stage. Keep the streak going.",
    emoji: "🌸",
    buttonLabel: "Nice",
  },
};

export function CongratulationsModal({
  variant,
  onClose,
}: {
  variant: Variant;
  onClose: () => void;
}) {
  const { title, message, emoji, buttonLabel } = CONTENT[variant];

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="congrats-title"
    >
      <div
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-md"
        aria-hidden
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm animate-success-pop rounded-2xl border-2 border-prove-200/90 p-7 shadow-soft-lg dark:border-prove-700/50 glass-card">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
          <span className="animate-celebrate-burst h-28 w-28 rounded-full bg-prove-400/25" />
        </div>
        <div className="relative text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-prove-500/15 animate-celebrate-check">
            <span className="text-4xl" role="img" aria-hidden>
              {emoji}
            </span>
          </div>
          <h2
            id="congrats-title"
            className="mt-4 font-display text-xl font-bold text-slate-900 dark:text-white"
          >
            {title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {message}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="cta-chunky mt-6 w-full"
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
