"use client";

import Link from "next/link";
import { X, ChevronRight } from "lucide-react";

interface UpgradePromptModalProps {
  open: boolean;
  onClose: () => void;
  requiredPlan?: "pro" | "premium";
  title?: string;
  message?: string;
}

export function UpgradePromptModal({
  open,
  onClose,
  requiredPlan = "pro",
  title,
  message,
}: UpgradePromptModalProps) {
  if (!open) return null;
  const effectiveTitle =
    title ?? (requiredPlan === "premium" ? "Premium feature" : "Pro feature");
  const effectiveMessage =
    message ??
    (requiredPlan === "premium"
      ? "Upgrade to Premium to unlock this feature."
      : "Upgrade to Pro or Premium to unlock this feature.");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-prompt-title"
    >
      <div
        className="absolute inset-0 bg-slate-900/25 backdrop-blur-md dark:bg-slate-950/50"
        aria-hidden
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-200/90 p-6 shadow-soft-lg dark:border-slate-600/50 glass-card">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 id="upgrade-prompt-title" className="pr-8 font-display text-lg font-semibold text-slate-900 dark:text-white">
          {effectiveTitle}
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{effectiveMessage}</p>
        <div className="mt-6 flex flex-col gap-2.5">
          <Link
            href="/pricing"
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-prove-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-prove-700 btn-glass-primary"
          >
            {requiredPlan === "premium" ? "View Premium plan" : "View Pro & Premium plans"}
            <ChevronRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
