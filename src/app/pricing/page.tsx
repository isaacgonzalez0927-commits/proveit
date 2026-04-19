"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Zap, Crown } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { setPostPlanWelcomeFlag } from "@/lib/postPlanWelcome";
import { canStartPremiumTrial } from "@/lib/premiumTrial";
import { PLANS, type PlanId } from "@/types";

function PricingContent() {
  const router = useRouter();
  const { user, setPlan } = useApp();
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  const handleSelectPlan = async (planId: PlanId) => {
    if (!user) return;
    await setPlan(planId, billing, {
      startPremiumTrial: planId === "premium" && canStartPremiumTrial(user),
    });
    setPostPlanWelcomeFlag(planId);
    router.push("/dashboard");
  };

  return (
    <>
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-10 px-4 py-6 pb-[max(6.5rem,env(safe-area-inset-bottom))] sm:py-8">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">
            Simple pricing
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Free: 2 goals, 3 plant styles. Pro: 5 goals, 6 plant styles, 6 theme colors, Goal Gallery, Goal Break (7 break-days per goal per month). Premium: unlimited goals, all 8 plant styles, all 10 theme colors. New to Premium? One 7-day free trial per account (then billed at the price you pick, or switch plans anytime).
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

        <div className="grid gap-5 sm:grid-cols-3 sm:gap-6">
          {PLANS.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              billing={billing}
              currentPlanId={user?.plan ?? null}
              currentPlanBilling={user?.planBilling ?? "monthly"}
              hasUser={!!user}
              canStartPremiumTrial={canStartPremiumTrial(user)}
              onSelect={() => handleSelectPlan(plan.id as PlanId)}
            />
          ))}
        </div>

        <p className="mx-auto max-w-2xl rounded-2xl px-4 py-4 text-center text-sm text-slate-600 dark:text-slate-400 glass-card">
          <strong>Free:</strong> 2 goals, full plant growth, streak tracking, dashboard. &bull; <strong>Pro:</strong> 5 goals, 6 accent themes, Goal Gallery, Goal Break (7 break-days per goal per calendar month). &bull; <strong>Premium:</strong> Unlimited goals, all 10 accent themes, 8 plant styles, weekly photo collages, Goal Break any duration.
        </p>
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
  canStartPremiumTrial,
  onSelect,
}: {
  plan: (typeof PLANS)[0];
  billing: "monthly" | "yearly";
  currentPlanId: PlanId | null;
  currentPlanBilling: "monthly" | "yearly";
  hasUser: boolean;
  canStartPremiumTrial: boolean;
  onSelect: () => void;
}) {
  const price =
    billing === "yearly" && plan.priceYearly >= 0
      ? plan.priceYearly
      : plan.priceMonthly;
  const isYearly = billing === "yearly" && plan.priceYearly > 0;
  const isCurrent =
    currentPlanId === plan.id && currentPlanBilling === billing;
  const isFree = plan.id === "free";
  const isPro = plan.id === "pro";
  const isPremium = plan.id === "premium";

  const Icon = isPro ? Zap : isPremium ? Crown : null;

  return (
    <div
      className={`relative rounded-2xl border p-6 glass-card ${
        isPremium
          ? "border-amber-300/90 shadow-lg dark:border-amber-600/50"
          : isPro
            ? "border-prove-400/80 shadow-lg dark:border-prove-600/45"
            : "border-slate-200/80 dark:border-slate-700/60"
      }`}
    >
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
      <div className="flex items-center gap-2">
        {Icon && (
          <Icon className={`h-5 w-5 ${isPremium ? "text-amber-600 dark:text-amber-400" : "text-prove-600 dark:text-prove-400"}`} />
        )}
        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
          {plan.name}
        </h2>
      </div>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-slate-900 dark:text-white">
          ${price}
        </span>
        <span className="text-slate-500 dark:text-slate-400">
          /{isYearly ? "year" : "month"}
        </span>
      </div>
      <ul className="mt-6 space-y-3">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
            <Check className={`h-5 w-5 shrink-0 ${isPremium ? "text-amber-500" : "text-prove-500"}`} />
            {f}
          </li>
        ))}
      </ul>
      <div className="mt-8">
        {isCurrent ? (
          <div className="rounded-lg border border-prove-300 bg-prove-100 py-2.5 text-center text-sm font-medium text-prove-800 dark:border-prove-700 dark:bg-prove-900/50 dark:text-prove-200">
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
            className={`block rounded-lg py-2.5 text-center text-sm font-medium ${
              isPremium
                ? "bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700"
                : isPro
                  ? "bg-prove-600 text-white hover:bg-prove-700 btn-glass-primary"
                  : isFree
                    ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    : "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            }`}
          >
            {isFree
              ? "Get started free"
              : isPremium && canStartPremiumTrial
                ? "Start 7-day free trial"
                : "Upgrade"}
          </Link>
        )}
      </div>
    </div>
  );
}

export default function PricingPage() {
  return <PricingContent />;
}
