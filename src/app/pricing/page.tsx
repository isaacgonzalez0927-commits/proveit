"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Sprout, Zap, Crown } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { setPostPlanWelcomeFlag } from "@/lib/postPlanWelcome";
import { startStripeCheckout } from "@/lib/checkoutClient";
import { formatUsd, planPriceForBilling, yearlySavingsPercent } from "@/lib/billing";
import { PLANS, type PlanId } from "@/types";

function PricingContent() {
  const router = useRouter();
  const { user, setPlan } = useApp();
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [planError, setPlanError] = useState<string | null>(null);
  const [busyPlan, setBusyPlan] = useState<PlanId | null>(null);

  const handleSelectPlan = async (planId: PlanId) => {
    if (!user) return;
    setPlanError(null);
    setBusyPlan(planId);

    try {
      if (planId === "free") {
        const ok = await setPlan(planId, billing);
        if (!ok) {
          setPlanError("Could not update your plan. Try again.");
          return;
        }
        setPostPlanWelcomeFlag(planId);
        router.push("/dashboard");
        return;
      }

      const checkout = await startStripeCheckout(planId, billing);
      if (checkout.ok) {
        window.location.href = checkout.url;
        return;
      }

      const ok = await setPlan(planId, billing);
      if (ok) {
        setPostPlanWelcomeFlag(planId);
        router.push("/dashboard");
        return;
      }
      setPlanError(checkout.error);
    } finally {
      setBusyPlan(null);
    }
  };

  return (
    <>
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-10 px-4 py-6 pb-[max(6.5rem,env(safe-area-inset-bottom))] sm:py-8">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">
            Simple pricing
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Start free. Upgrade to Pro or Premium when you are ready.
          </p>
          <div className="mt-6 inline-flex justify-center gap-2 rounded-2xl p-1.5 glass-card">
            <button
              onClick={() => setBilling("monthly")}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                billing === "monthly"
                  ? "bg-prove-600 text-white btn-glass-primary"
                  : "text-slate-700 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/5"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                billing === "yearly"
                  ? "bg-prove-600 text-white btn-glass-primary"
                  : "text-slate-700 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/5"
              }`}
            >
              Yearly
              <span className="ml-2 rounded bg-prove-200 px-1.5 py-0.5 text-xs text-prove-800 dark:bg-prove-900 dark:text-prove-200">
                Save up to 36%
              </span>
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Yearly = pay once per year. Pro saves 25%, Premium saves 36% vs monthly.
          </p>
        </div>

        {planError && (
          <p className="text-center text-sm text-red-600 dark:text-red-400" role="alert">
            {planError}
          </p>
        )}

        <div className="grid gap-5 sm:grid-cols-3 sm:gap-6">
          {PLANS.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              billing={billing}
              currentPlanId={user?.plan ?? null}
              currentPlanBilling={user?.planBilling ?? "monthly"}
              hasUser={!!user}
              onSelect={() => handleSelectPlan(plan.id as PlanId)}
              busy={busyPlan === plan.id}
            />
          ))}
        </div>

        <section className="overflow-hidden rounded-2xl border border-amber-300/80 bg-gradient-to-br from-amber-50/90 via-white to-prove-50/80 p-6 dark:border-amber-700/50 dark:from-amber-950/30 dark:via-slate-900 dark:to-prove-950/20">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Premium extras
            </h2>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            Premium is for power users who want unlimited goals, richer AI, and shareable proof collages
            built automatically from your gallery each week.
          </p>
          <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                Weekly photo collages from your verified proofs
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                One-tap share or download as a PNG for Stories and messages
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                Share your streak progress card from the dashboard
              </li>
            </ul>
            <div
              className="grid grid-cols-3 gap-1.5 rounded-2xl border border-amber-200/80 bg-white/70 p-3 shadow-sm dark:border-amber-800/50 dark:bg-slate-900/60"
              aria-hidden
            >
              {Array.from({ length: 9 }, (_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-lg bg-gradient-to-br from-prove-200 via-emerald-200 to-amber-200 dark:from-prove-900 dark:via-emerald-900 dark:to-amber-900"
                />
              ))}
            </div>
          </div>
        </section>

      </main>
    </>
  );
}

function PricingCard({
  plan,
  billing,
  currentPlanId,
  currentPlanBilling,
  hasUser,
  onSelect,
  busy,
}: {
  plan: (typeof PLANS)[0];
  billing: "monthly" | "yearly";
  currentPlanId: PlanId | null;
  currentPlanBilling: "monthly" | "yearly";
  hasUser: boolean;
  onSelect: () => void;
  busy?: boolean;
}) {
  const isCurrent =
    currentPlanId === plan.id && currentPlanBilling === billing;
  const isFree = plan.id === "free";
  const isPro = plan.id === "pro";
  const isPremium = plan.id === "premium";

  const Icon = isFree ? Sprout : isPro ? Zap : Crown;
  const price = planPriceForBilling(plan, billing);
  const yearlySave = yearlySavingsPercent(plan);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-6 glass-card ${
        isPremium
          ? "border-amber-300/90 shadow-lg dark:border-amber-600/50"
          : isPro
            ? "border-prove-400/80 shadow-lg dark:border-prove-600/45"
            : "border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 via-white to-prove-50/60 shadow-md shadow-emerald-600/5 dark:border-emerald-700/45 dark:from-emerald-950/35 dark:via-slate-900 dark:to-prove-950/20 dark:shadow-emerald-900/20"
      }`}
    >
      {isFree && (
        <>
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald-200/50 blur-3xl dark:bg-emerald-800/25"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-prove-200/40 blur-2xl dark:bg-prove-800/20"
            aria-hidden
          />
        </>
      )}
      {isFree && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-medium text-white dark:bg-emerald-500">
          Start here
        </span>
      )}
      {isPro && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-prove-600 px-3 py-0.5 text-xs font-medium text-white">
          Popular
        </span>
      )}
      {isPremium && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-0.5 text-xs font-medium text-white">
          Best value
        </span>
      )}
      <div className="relative flex items-center gap-2">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            isPremium
              ? "bg-amber-100 dark:bg-amber-950/50"
              : isPro
                ? "bg-prove-100 dark:bg-prove-950/50"
                : "bg-emerald-100 dark:bg-emerald-950/50"
          }`}
        >
          <Icon
            className={`h-5 w-5 ${
              isPremium
                ? "text-amber-600 dark:text-amber-400"
                : isPro
                  ? "text-prove-600 dark:text-prove-400"
                  : "text-emerald-600 dark:text-emerald-400"
            }`}
          />
        </span>
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            {plan.name}
          </h2>
          {isFree && (
            <p className="text-xs text-emerald-700/90 dark:text-emerald-300/90">
              Forever free · no card needed
            </p>
          )}
        </div>
      </div>
      <div className="relative mt-4 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-slate-900 dark:text-white">
          {isFree ? "Free" : formatUsd(price)}
        </span>
        {!isFree && (
          <span className="text-slate-500 dark:text-slate-400">
            /{billing === "yearly" ? "year" : "mo"}
          </span>
        )}
      </div>
      {!isFree && billing === "yearly" && yearlySave != null && (
        <p className="mt-1 text-xs font-medium text-prove-600 dark:text-prove-400">
          Save {yearlySave}% vs monthly
        </p>
      )}
      <ul className="relative mt-6 space-y-3">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
            <Check
              className={`h-5 w-5 shrink-0 ${
                isPremium ? "text-amber-500" : isPro ? "text-prove-500" : "text-emerald-500"
              }`}
            />
            {f}
          </li>
        ))}
      </ul>
      <div className="relative mt-8">
        {isCurrent ? (
          <div
            className={`rounded-xl py-2.5 text-center text-sm font-semibold ${
              isFree
                ? "border border-emerald-300/80 bg-emerald-100/90 text-emerald-900 dark:border-emerald-700/60 dark:bg-emerald-950/50 dark:text-emerald-200"
                : "border border-prove-300 bg-prove-100 text-prove-800 dark:border-prove-700 dark:bg-prove-900/50 dark:text-prove-200"
            }`}
          >
            Current plan
          </div>
        ) : (
          <Link
            href={hasUser ? "/dashboard" : "/"}
            onClick={(e) => {
              if (hasUser) {
                e.preventDefault();
                onSelect();
              }
            }}
            className={`block rounded-xl py-2.5 text-center text-sm font-semibold transition ${
              isPremium
                ? "bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700"
                : isPro
                  ? "bg-prove-600 text-white hover:bg-prove-700 btn-glass-primary"
                  : isFree
                    ? "bg-gradient-to-r from-emerald-600 to-prove-600 text-white shadow-md shadow-emerald-600/20 hover:from-emerald-700 hover:to-prove-700 dark:from-emerald-500 dark:to-prove-500"
                    : "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            }`}
          >
            {isFree
              ? busy
                ? "Updating…"
                : "Get started free"
              : busy
                ? "Opening checkout…"
                : `Subscribe to ${plan.name}`}
          </Link>
        )}
      </div>
    </div>
  );
}

export default function PricingPage() {
  return <PricingContent />;
}
