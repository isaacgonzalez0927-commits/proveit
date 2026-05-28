"use client";

import Link from "next/link";
import { CheckCircle2, ChevronRight, Crown, Sparkles, X, Zap } from "lucide-react";

interface UpgradePromptModalProps {
  open: boolean;
  onClose: () => void;
  requiredPlan?: "pro" | "premium";
  title?: string;
  message?: string;
}

const PRO_PERKS = [
  "Goal Break & extra plant styles",
  "Goal Gallery & Streak Shields",
  "Strict AI and more monthly checks",
];

const PREMIUM_PERKS = [
  "Unlimited goals & all plant styles",
  "Weekly proof collages & share images",
  "All accent themes & Premium badges",
];

export function UpgradePromptModal({
  open,
  onClose,
  requiredPlan = "pro",
  title,
  message,
}: UpgradePromptModalProps) {
  if (!open) return null;

  const isPremium = requiredPlan === "premium";
  const effectiveTitle =
    title ?? (isPremium ? "Premium feature" : "Pro feature");
  const effectiveMessage =
    message ??
    (isPremium
      ? "Upgrade to Premium to unlock this feature."
      : "Upgrade to Pro or Premium to unlock this feature.");
  const perks = isPremium ? PREMIUM_PERKS : PRO_PERKS;
  const Icon = isPremium ? Crown : Zap;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-prompt-title"
    >
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md dark:bg-slate-950/65"
        aria-hidden
        onClick={onClose}
      />
      <div
        className={`relative w-full max-w-sm overflow-hidden rounded-3xl border shadow-2xl ${
          isPremium
            ? "border-amber-300/80 bg-gradient-to-br from-amber-50 via-white to-prove-50 dark:border-amber-700/50 dark:from-amber-950/50 dark:via-slate-900 dark:to-prove-950/30"
            : "border-prove-300/80 bg-gradient-to-br from-prove-50 via-white to-emerald-50 dark:border-prove-700/50 dark:from-prove-950/50 dark:via-slate-900 dark:to-emerald-950/25"
        }`}
      >
        <div
          className={`pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full blur-3xl ${
            isPremium ? "bg-amber-200/60 dark:bg-amber-800/30" : "bg-prove-200/60 dark:bg-prove-800/30"
          }`}
          aria-hidden
        />
        <div
          className={`pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full blur-2xl ${
            isPremium ? "bg-prove-200/40 dark:bg-prove-800/25" : "bg-emerald-200/50 dark:bg-emerald-800/25"
          }`}
          aria-hidden
        />

        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-slate-500 transition hover:bg-white/70 hover:text-slate-800 dark:hover:bg-white/10 dark:hover:text-slate-200"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative px-6 pb-6 pt-8 text-center">
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg ${
              isPremium
                ? "bg-gradient-to-br from-amber-500 to-amber-600 shadow-amber-600/30"
                : "bg-gradient-to-br from-prove-500 to-emerald-500 shadow-prove-600/30"
            }`}
          >
            <Icon className="h-8 w-8 text-white" />
          </div>

          <span
            className={`mt-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
              isPremium
                ? "border-amber-200/90 bg-white/90 text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/50 dark:text-amber-200"
                : "border-prove-200/90 bg-white/90 text-prove-900 dark:border-prove-700/60 dark:bg-prove-950/50 dark:text-prove-200"
            }`}
          >
            <Sparkles className="h-3 w-3" />
            {isPremium ? "Premium only" : "Pro or Premium"}
          </span>

          <h2
            id="upgrade-prompt-title"
            className="mt-4 font-display text-xl font-bold text-slate-900 dark:text-white"
          >
            {effectiveTitle}
          </h2>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {effectiveMessage}
          </p>

          <ul className="mx-auto mt-5 max-w-xs space-y-2 text-left text-sm text-slate-700 dark:text-slate-300">
            {perks.map((perk) => (
              <li key={perk} className="flex items-start gap-2">
                <CheckCircle2
                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                    isPremium ? "text-amber-500" : "text-prove-500"
                  }`}
                />
                {perk}
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-col gap-2.5">
            <Link
              href="/pricing"
              onClick={onClose}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-md transition btn-glass-primary ${
                isPremium
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 shadow-amber-600/25 hover:from-amber-600 hover:to-amber-700"
                  : "bg-gradient-to-r from-prove-600 to-emerald-600 shadow-prove-600/25 hover:from-prove-700 hover:to-emerald-700"
              }`}
            >
              {isPremium ? "View Premium plan" : "View Pro & Premium plans"}
              <ChevronRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200/90 bg-white/70 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-white dark:border-slate-600/70 dark:bg-slate-900/50 dark:text-slate-200 dark:hover:bg-slate-900/80"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
