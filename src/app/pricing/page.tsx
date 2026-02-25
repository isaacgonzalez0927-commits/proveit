"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Zap, Crown } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Header } from "@/components/Header";
import { PLANS, type PlanId } from "@/types";

function PricingContent() {
  const router = useRouter();
  const { user, setPlan } = useApp();
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  const handleSelectPlan = async (planId: PlanId) => {
    if (!user) return;
    await setPlan(planId, billing);
    router.push("/dashboard");
  };

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-[max(6.5rem,env(safe-area-inset-bottom))]">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">
            Simple pricing
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Free: 2 daily + 1 weekly goal, 3 plant styles. Pro: 5 daily + 5 weekly, 6 plant styles, Goal Gallery, Goal Break. Premium: unlimited goals, all 8 plant styles.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <button
              onClick={() => setBilling("monthly")}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                billing === "monthly"
                  ? "bg-prove-600 text-white"
                  : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                billing === "yearly"
                  ? "bg-prove-600 text-white"
                  : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
              }`}
            >
              Yearly
              <span className="ml-2 rounded bg-prove-200 px-1.5 py-0.5 text-xs text-prove-800 dark:bg-prove-900 dark:text-prove-200">
                Save up to 36%
              </span>
            </button>
          </div>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {PLANS.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              billing={billing}
              currentPlanId={user?.plan ?? null}
              currentPlanBilling={user?.planBilling ?? "monthly"}
              hasUser={!!user}
              onSelect={() => handleSelectPlan(plan.id as PlanId)}
            />
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Free: full plant growth, streak tracking, dashboard. Pro: 4 accent themes, Goal Gallery, Goal Break (up to 3 days). Premium: all 10 accent themes, 8 plant styles, weekly goal photo collages, Goal Break any duration.
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
  onSelect,
}: {
  plan: (typeof PLANS)[0];
  billing: "monthly" | "yearly";
  currentPlanId: PlanId | null;
  currentPlanBilling: "monthly" | "yearly";
  hasUser: boolean;
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
      className={`relative rounded-2xl border p-6 ${
        isPremium
          ? "border-amber-400 bg-amber-50/40 shadow-lg dark:border-amber-600 dark:bg-amber-950/25"
          : isPro
            ? "border-prove-400 bg-prove-50/50 shadow-lg dark:border-prove-600 dark:bg-prove-950/30"
            : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
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
                  ? "bg-prove-600 text-white hover:bg-prove-700"
                  : isFree
                    ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    : "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            }`}
          >
            {isFree ? "Get started free" : "Upgrade"}
          </Link>
        )}
      </div>
    </div>
  );
}

export default function PricingPage() {
  return <PricingContent />;
}
