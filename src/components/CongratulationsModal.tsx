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
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-hidden
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-white/20 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900 animate-success-pop">
        <div className="text-center">
          <span className="text-5xl" role="img" aria-hidden>
            {emoji}
          </span>
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
            className="mt-6 w-full rounded-xl bg-prove-600 py-3 text-sm font-semibold text-white hover:bg-prove-700 btn-glass-primary"
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
