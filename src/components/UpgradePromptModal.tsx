"use client";

import Link from "next/link";
import { X, ChevronRight } from "lucide-react";

interface UpgradePromptModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

export function UpgradePromptModal({
  open,
  onClose,
  title = "Pro or Premium feature",
  message = "Upgrade to Pro or Premium to use this feature.",
}: UpgradePromptModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-prompt-title"
    >
      <div
        className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/70"
        aria-hidden
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 id="upgrade-prompt-title" className="pr-8 font-display text-lg font-semibold text-slate-900 dark:text-white">
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{message}</p>
        <div className="mt-5 flex flex-col gap-2">
          <Link
            href="/pricing"
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-prove-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-prove-700"
          >
            View Pro & Premium plans
            <ChevronRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
