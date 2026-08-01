import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlanId, User } from "@/types";
import { getAiCoachLimit } from "@/lib/subscriptionLimits";

/**
 * AI Coach weekly usage window: **UTC weeks**, Monday 00:00 UTC → Sunday 23:59:59 UTC.
 * Cycle key format: `yyyy-MM-dd` of that Monday (UTC).
 */
export const AI_COACH_WEEK_TZ = "UTC" as const;

/** Monday (UTC) date key for the week containing `date`. */
export function aiCoachUtcWeekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0 = Sun … 6 = Sat
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + mondayOffset);
  return d.toISOString().slice(0, 10);
}

export function effectiveAiCoachCount(
  user: Pick<User, "aiVerificationCycleKey" | "aiVerificationCount">,
  now: Date = new Date()
): number {
  const key = aiCoachUtcWeekKey(now);
  if (user.aiVerificationCycleKey !== key) return 0;
  return typeof user.aiVerificationCount === "number" ? user.aiVerificationCount : 0;
}

export function getAiCoachRemaining(
  user: Pick<User, "plan" | "aiVerificationCycleKey" | "aiVerificationCount">,
  now: Date = new Date()
): number {
  const limit = getAiCoachLimit(user.plan);
  return Math.max(0, limit - effectiveAiCoachCount(user, now));
}

export function aiCoachUsageSummary(
  user: Pick<User, "plan" | "aiVerificationCycleKey" | "aiVerificationCount">,
  now: Date = new Date()
): {
  limit: number;
  used: number;
  remaining: number;
  weekKey: string;
  timezone: typeof AI_COACH_WEEK_TZ;
} {
  const weekKey = aiCoachUtcWeekKey(now);
  const limit = getAiCoachLimit(user.plan);
  const used = effectiveAiCoachCount(user, now);
  return {
    limit,
    used,
    remaining: Math.max(0, limit - used),
    weekKey,
    timezone: AI_COACH_WEEK_TZ,
  };
}

export type ConsumeAiCoachResult =
  | {
      ok: true;
      used: number;
      remaining: number;
      limit: number;
      weekKey: string;
    }
  | {
      ok: false;
      reason: "limit_reached" | "no_profile" | "update_failed";
      used: number;
      remaining: number;
      limit: number;
      weekKey: string;
      message: string;
    };

/**
 * Consume one AI Coach use for the UTC week.
 * Resets the counter when the stored cycle key is stale.
 */
export async function consumeAiCoachUse(
  supabase: SupabaseClient,
  userId: string,
  plan: PlanId,
  now: Date = new Date()
): Promise<ConsumeAiCoachResult> {
  const weekKey = aiCoachUtcWeekKey(now);
  const limit = getAiCoachLimit(plan);

  const { data, error } = await supabase
    .from("profiles")
    .select("plan, ai_verification_cycle_key, ai_verification_count")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      reason: "no_profile",
      used: 0,
      remaining: limit,
      limit,
      weekKey,
      message: "Could not load AI Coach usage.",
    };
  }

  const sameWeek = data.ai_verification_cycle_key === weekKey;
  const used =
    sameWeek && typeof data.ai_verification_count === "number" ? data.ai_verification_count : 0;

  if (used >= limit) {
    return {
      ok: false,
      reason: "limit_reached",
      used,
      remaining: 0,
      limit,
      weekKey,
      message:
        limit <= 0
          ? "AI Coach is not available on Free. Upgrade to Pro or Premium for weekly coach uses."
          : `AI Coach limit reached (${limit}/week, UTC). Resets next Monday 00:00 UTC.`,
    };
  }

  const nextUsed = used + 1;
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      ai_verification_cycle_key: weekKey,
      ai_verification_count: nextUsed,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (updateError) {
    return {
      ok: false,
      reason: "update_failed",
      used,
      remaining: Math.max(0, limit - used),
      limit,
      weekKey,
      message: "Could not update AI Coach usage.",
    };
  }

  return {
    ok: true,
    used: nextUsed,
    remaining: Math.max(0, limit - nextUsed),
    limit,
    weekKey,
  };
}
