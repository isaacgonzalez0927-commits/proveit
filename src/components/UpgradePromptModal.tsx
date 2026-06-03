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
  "5 goals & Goal Gallery",
  "6 plant styles & 6 accent themes",
  "1 Streak Shield per billing cycle & unlimited AI verification",
];

const PREMIUM_PERKS = [
  "Unlimited goals & all 8 plant styles",
  "Weekly proof collages & share images",
  "All 10 themes, 1 Shield per cycle & Premium badges",
];

function ProUpgradeCard({
  title,
  message,
  onClose,
}: {
  title: string;
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-prove-300/90 bg-gradient-to-br from-prove-50 via-white to-emerald-50 shadow-2xl shadow-prove-900/10 dark:border-prove-600/50 dark:from-prove-950/55 dark:via-slate-900 dark:to-emerald-950/30">
      <div className="h-1.5 bg-gradient-to-r from-prove-500 via-emerald-500 to-prove-400" />
      <div
        className="pointer-events-none absolute -right-10 top-6 h-36 w-36 rounded-full bg-prove-200/60 blur-3xl dark:bg-prove-800/30"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-emerald-200/50 blur-2xl dark:bg-emerald-800/25"
        aria-hidden
      />

      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-5 z-10 rounded-full p-1.5 text-slate-500 transition hover:bg-white/70 hover:text-slate-800 dark:hover:bg-white/10 dark:hover:text-slate-200"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="relative px-6 pb-6 pt-7 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-prove-500 to-emerald-500 shadow-lg shadow-prove-600/30">
          <Zap className="h-8 w-8 text-white" />
        </div>

        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-prove-200/90 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-prove-900 dark:border-prove-700/60 dark:bg-prove-950/50 dark:text-prove-200">
          <Sparkles className="h-3 w-3" />
          Pro plan
        </span>

        <h2 id="upgrade-prompt-title" className="mt-4 font-display text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {message}
        </p>

        <ul className="mx-auto mt-5 max-w-xs space-y-2 text-left text-sm text-slate-700 dark:text-slate-300">
          {PRO_PERKS.map((perk) => (
            <li key={perk} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-prove-500" />
              {perk}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-col gap-2.5">
          <Link
            href="/pricing"
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-prove-600 to-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-prove-600/25 transition hover:from-prove-700 hover:to-emerald-700 btn-glass-primary"
          >
            View Pro plan
            <ChevronRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-prove-200/80 bg-white/70 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-white dark:border-prove-800/60 dark:bg-slate-900/50 dark:text-slate-200 dark:hover:bg-slate-900/80"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

function PremiumUpgradeCard({
  title,
  message,
  onClose,
}: {
  title: string;
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-amber-300/90 bg-gradient-to-br from-amber-50 via-white to-amber-100/80 shadow-2xl shadow-amber-900/15 dark:border-amber-600/50 dark:from-amber-950/55 dark:via-slate-900 dark:to-amber-950/35">
      <div className="h-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-400" />
      <div
        className="pointer-events-none absolute -right-10 top-6 h-36 w-36 rounded-full bg-amber-200/70 blur-3xl dark:bg-amber-800/35"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-orange-200/45 blur-2xl dark:bg-orange-900/25"
        aria-hidden
      />

      <span className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
        Best value
      </span>

      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-5 z-10 rounded-full p-1.5 text-slate-500 transition hover:bg-white/70 hover:text-slate-800 dark:hover:bg-white/10 dark:hover:text-slate-200"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="relative px-6 pb-6 pt-10 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 shadow-lg shadow-amber-600/35 ring-2 ring-amber-200/80 dark:ring-amber-700/50">
          <Crown className="h-8 w-8 text-white" />
        </div>

        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-amber-200/90 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/50 dark:text-amber-200">
          <Crown className="h-3 w-3" />
          Premium only
        </span>

        <h2 id="upgrade-prompt-title" className="mt-4 font-display text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {message}
        </p>

        <div
          className="mx-auto mt-5 grid max-w-[11rem] grid-cols-3 gap-1 rounded-xl border border-amber-200/80 bg-white/60 p-2 dark:border-amber-800/50 dark:bg-slate-900/50"
          aria-hidden
        >
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="aspect-square rounded-md bg-gradient-to-br from-amber-200 via-prove-200 to-emerald-200 dark:from-amber-900 dark:via-prove-900 dark:to-emerald-900"
            />
          ))}
        </div>

        <ul className="mx-auto mt-5 max-w-xs space-y-2 text-left text-sm text-slate-700 dark:text-slate-300">
          {PREMIUM_PERKS.map((perk) => (
            <li key={perk} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              {perk}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-col gap-2.5">
          <Link
            href="/pricing"
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-amber-600/30 transition hover:from-amber-600 hover:to-orange-600"
          >
            View Premium plan
            <ChevronRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-amber-200/80 bg-white/70 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-white dark:border-amber-800/60 dark:bg-slate-900/50 dark:text-slate-200 dark:hover:bg-slate-900/80"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

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
    title ??
    (isPremium ? "This is a Premium feature" : "This is a Pro feature");
  const effectiveMessage =
    message ??
    (isPremium
      ? "Upgrade to Premium to unlock everything Pro has, plus unlimited goals, collages, and exclusive cosmetics."
      : "Upgrade to Pro for more goals, Gallery, plant styles, and a Streak Shield each billing cycle.");

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
      {isPremium ? (
        <PremiumUpgradeCard title={effectiveTitle} message={effectiveMessage} onClose={onClose} />
      ) : (
        <ProUpgradeCard title={effectiveTitle} message={effectiveMessage} onClose={onClose} />
      )}
    </div>
  );
}
