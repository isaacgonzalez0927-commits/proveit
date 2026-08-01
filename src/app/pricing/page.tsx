"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Zap, Crown, Sparkles } from "lucide-react";
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
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-6 pb-[max(6.5rem,env(safe-area-inset-bottom))] sm:py-8">
        <section className="paywall-hero relative overflow-hidden rounded-[1.75rem] border-2 border-prove-500/35 px-5 py-8 text-center shadow-[0_8px_0_rgba(0,0,0,0.35)] sm:px-8">
          <div
            className="pointer-events-none absolute -right-8 top-0 h-40 w-40 rounded-full bg-prove-400/25 blur-3xl"
            aria-hidden
          />
          <div className="relative mx-auto flex max-w-lg flex-col items-center">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-prove-400">
              Proveit plans
            </p>
            <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-white sm:text-4xl">
              Level up your grind
            </h1>
            <p className="mt-2 text-sm font-medium text-white/75">
              Chunkier goals, a real AI Coach (Pro/Premium), unlimited Gardener&apos;s Notes from
              proof, and themes that match the navy + lime vibe.
            </p>
          </div>
        </section>

        <div className="text-center">
          <div className="inline-flex justify-center gap-2 rounded-2xl border-2 border-prove-300/70 bg-white/80 p-1.5 dark:border-prove-700/60 dark:bg-[#0a1428]/80">
            <button
              onClick={() => setBilling("monthly")}
              className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                billing === "monthly"
                  ? "cta-chunky !min-h-0 !py-2 !shadow-[0_3px_0_rgb(var(--prove-800-rgb))]"
                  : "text-slate-700 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/5"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                billing === "yearly"
                  ? "cta-chunky !min-h-0 !py-2 !shadow-[0_3px_0_rgb(var(--prove-800-rgb))]"
                  : "text-slate-700 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/5"
              }`}
            >
              Yearly
              <span className="ml-2 rounded-md bg-prove-500 px-1.5 py-0.5 text-xs font-black text-[#050a18]">
                Save up to 36%
              </span>
            </button>
          </div>
          <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            Yearly = pay once per year. Pro saves 25%, Premium saves 36% vs monthly.
          </p>
        </div>

        {planError && (
          <p className="text-center text-sm font-semibold text-red-600 dark:text-red-400" role="alert">
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

        <p className="flex items-center justify-center gap-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
          <Sparkles className="h-3.5 w-3.5 text-prove-500" />
          Secure checkout via Stripe · cancel anytime in Settings
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

  const Icon = isPro ? Zap : isPremium ? Crown : null;
  const price = planPriceForBilling(plan, billing);
  const yearlySave = yearlySavingsPercent(plan);

  return (
    <div
      className={`relative duo-card p-6 ${
        isPremium
          ? "!border-prove-400 !shadow-[0_6px_0_rgb(var(--prove-700-rgb))]"
          : isPro
            ? "!border-prove-500"
            : ""
      }`}
    >
      {isPro && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-prove-500 px-3 py-0.5 text-xs font-black text-[#050a18]">
          Popular
        </span>
      )}
      {isPremium && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#050a18] px-3 py-0.5 text-xs font-black text-prove-400 ring-2 ring-prove-500">
          Best value
        </span>
      )}
      <div className="flex items-center gap-2">
        {Icon && (
          <Icon className={`h-5 w-5 ${isPremium ? "text-prove-500" : "text-prove-600 dark:text-prove-400"}`} />
        )}
        <h2 className="font-display text-lg font-black text-slate-900 dark:text-white">
          {plan.name}
        </h2>
      </div>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-3xl font-black text-slate-900 dark:text-white">
          {formatUsd(price)}
        </span>
        {!isFree && (
          <span className="font-semibold text-slate-500 dark:text-slate-400">
            /{billing === "yearly" ? "year" : "mo"}
          </span>
        )}
      </div>
      {!isFree && billing === "yearly" && yearlySave != null && (
        <p className="mt-1 text-xs font-bold text-prove-700 dark:text-prove-400">
          Save {yearlySave}% vs monthly
        </p>
      )}
      <ul className="mt-6 space-y-3">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            <Check className="h-5 w-5 shrink-0 text-prove-500" />
            {f}
          </li>
        ))}
      </ul>
      <div className="mt-8">
        {isCurrent ? (
          <div className="rounded-xl border-2 border-prove-400 bg-prove-100 py-3 text-center text-sm font-black text-prove-900 dark:border-prove-600 dark:bg-prove-950/50 dark:text-prove-200">
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
            className={
              isFree
                ? "block rounded-xl border-2 border-slate-300 bg-white py-3 text-center text-sm font-black text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-[#0a1428] dark:text-slate-200"
                : "cta-chunky w-full"
            }
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
