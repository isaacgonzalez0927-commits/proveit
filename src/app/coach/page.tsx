"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, MessageCircle, Sparkles } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { LoadingView } from "@/components/LoadingView";
import { aiCoachUsageSummary } from "@/lib/aiCoachUsage";
import { getAiCoachLimit } from "@/lib/subscriptionLimits";
import { countVerifiedInCalendarWeek } from "@/lib/goalDue";
import { getGoalStreak } from "@/lib/goalProgress";

const QUICK_PROMPTS = [
  "How do I get back on track this week?",
  "What's the smallest proof I should aim for tomorrow?",
  "Help me protect my streak without burning out.",
];

export default function AiCoachPage() {
  const router = useRouter();
  const { user, setUser, goals, getSubmissionsForGoal, graceDayEvents, authReady } = useApp();
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const usage = user ? aiCoachUsageSummary(user) : null;
  const activeGoals = useMemo(
    () => goals.filter((g) => !g.archivedAt),
    [goals]
  );

  const goalsSummary = useMemo(() => {
    const now = new Date();
    return activeGoals.slice(0, 8).map((goal) => ({
      title: goal.title,
      description: goal.description,
      timesPerWeek: goal.timesPerWeek,
      streak: getGoalStreak(goal, getSubmissionsForGoal, graceDayEvents),
      provedThisWeek: countVerifiedInCalendarWeek(getSubmissionsForGoal(goal.id), now),
    }));
  }, [activeGoals, getSubmissionsForGoal, graceDayEvents]);

  if (!authReady) return <LoadingView message="Loading AI Coach…" />;
  if (!user) {
    return (
      <main className="mx-auto max-w-lg px-4 py-10 text-center">
        <p className="text-sm text-slate-600 dark:text-slate-300">Sign in to use AI Coach.</p>
        <Link href="/" className="cta-chunky mt-4 inline-flex">
          Sign in
        </Link>
      </main>
    );
  }

  const askCoach = async (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    setReply(null);
    try {
      const goal = activeGoals.find((g) => g.id === selectedGoalId) ?? null;
      const now = new Date();
      const res = await fetch("/api/ai-coach", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          goal: goal
            ? {
                title: goal.title,
                description: goal.description,
                timesPerWeek: goal.timesPerWeek,
                streak: getGoalStreak(goal, getSubmissionsForGoal, graceDayEvents),
                provedThisWeek: countVerifiedInCalendarWeek(getSubmissionsForGoal(goal.id), now),
              }
            : null,
          goalsSummary,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        reply?: string;
        error?: string;
        code?: string;
        aiCoach?: {
          used: number;
          remaining: number;
          limit: number;
          weekKey: string;
        };
      };

      if (data.aiCoach) {
        setUser({
          ...user,
          aiVerificationCount: data.aiCoach.used,
          aiVerificationCycleKey: data.aiCoach.weekKey,
        });
      }

      if (!res.ok) {
        setError(data.error ?? "AI Coach is unavailable right now.");
        return;
      }
      setReply(data.reply ?? "Keep going — one proof at a time.");
      setMessage("");
    } catch {
      setError("Could not reach AI Coach. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void askCoach(message);
  };

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6 pb-[max(6.5rem,env(safe-area-inset-bottom))]">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <section className="rounded-2xl border-2 border-prove-500/35 bg-gradient-to-br from-[#071022] via-[#0a1630] to-[#0c1f18] px-5 py-6 text-white shadow-[0_6px_0_rgba(0,0,0,0.35)]">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-prove-400">
          <Sparkles className="h-3.5 w-3.5" />
          AI Coach
        </p>
        <h1 className="mt-2 font-display text-2xl font-black tracking-tight">
          Ask for a game plan
        </h1>
        <p className="mt-2 text-sm text-white/75">
          Habit coaching separate from photo proof. Gardener&apos;s Notes still come from verified
          check-ins in your garden.
        </p>
        {usage ? (
          <p className="mt-3 text-xs font-bold text-prove-300">
            {usage.limit === 0
              ? "Free plan: AI Coach is a Pro/Premium feature"
              : `${usage.remaining}/${usage.limit} uses left this week (UTC)`}
          </p>
        ) : null}
      </section>

      {usage && usage.limit === 0 ? (
        <div className="mt-5 rounded-2xl border border-amber-300/70 bg-amber-50/90 p-4 dark:border-amber-700/50 dark:bg-amber-950/30">
          <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
            Upgrade for AI Coach
          </p>
          <p className="mt-1 text-xs text-amber-900/90 dark:text-amber-200/90">
            Pro: {getAiCoachLimit("pro")}/week · Premium: {getAiCoachLimit("premium")}/week (UTC).
            Photo verification &amp; Gardener&apos;s Notes stay unlimited on Free.
          </p>
          <Link href="/pricing" className="cta-chunky mt-4 inline-flex w-full justify-center">
            See plans
          </Link>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Focus goal (optional)
          </span>
          <select
            value={selectedGoalId}
            onChange={(e) => setSelectedGoalId(e.target.value)}
            className="mt-1.5 w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="">All goals</option>
            {activeGoals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={busy || (usage?.remaining ?? 0) <= 0}
              onClick={() => void askCoach(prompt)}
              className="rounded-xl border-2 border-prove-300/70 bg-prove-50 px-3 py-2 text-left text-xs font-semibold text-prove-950 disabled:opacity-50 dark:border-prove-700 dark:bg-prove-950/40 dark:text-prove-100"
            >
              {prompt}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Your question
          </span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={800}
            placeholder="e.g. I missed two gym days — how do I restart without quitting?"
            className="mt-1.5 w-full resize-none rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </label>

        <button
          type="submit"
          disabled={busy || !message.trim() || (usage?.remaining ?? 0) <= 0}
          className="cta-chunky inline-flex w-full items-center justify-center gap-2 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
          {busy ? "Coaching…" : "Ask AI Coach"}
        </button>
      </form>

      {error ? (
        <div className="mt-5 rounded-2xl border border-red-300/70 bg-red-50/90 p-4 text-sm text-red-900 dark:border-red-700/50 dark:bg-red-950/30 dark:text-red-100">
          <p>{error}</p>
          {(usage?.remaining ?? 0) <= 0 ? (
            <Link href="/pricing" className="mt-3 inline-flex text-sm font-bold underline">
              Upgrade for more AI Coach uses
            </Link>
          ) : null}
        </div>
      ) : null}

      {reply ? (
        <div className="mt-5 rounded-2xl border-2 border-prove-400/50 bg-white/90 p-4 dark:border-prove-700 dark:bg-[#0a1428]/90">
          <p className="text-[10px] font-black uppercase tracking-wide text-prove-700 dark:text-prove-300">
            Coach reply
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-100">
            {reply}
          </p>
          <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
            Tip: verified proofs still leave a Gardener&apos;s Note on your plant in the Goal Garden —
            that&apos;s separate from this coach.
          </p>
        </div>
      ) : null}
    </main>
  );
}
