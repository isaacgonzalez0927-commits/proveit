import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assertCronAuthorized } from "@/lib/cronAuth";
import { getGraceDayResetBalance } from "@/lib/subscriptionLimits";
import { normalizePlanId } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cycleKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
  const unauthorized = assertCronAuthorized(request);
  if (unauthorized) return unauthorized;

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const now = new Date();
  const key = cycleKey(now);
  const { data, error } = await supabase
    .from("profiles")
    .select("id, plan, grace_day_cycle_anchor");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const resetIds: Array<{ id: string; balance: number }> = [];
  for (const row of data ?? []) {
    const profile = row as Record<string, unknown>;
    const id = String(profile.id ?? "");
    const plan = normalizePlanId(profile.plan);
    const balance = getGraceDayResetBalance(plan);
    const anchor = typeof profile.grace_day_cycle_anchor === "string"
      ? profile.grace_day_cycle_anchor
      : null;
    if (cycleKey(anchor ? new Date(anchor) : new Date(0)) !== key) {
      await supabase
        .from("profiles")
        .update({
          grace_day_balance: balance,
          grace_day_cycle_anchor: now.toISOString(),
          ai_verification_cycle_key: null,
          ai_verification_count: 0,
          updated_at: now.toISOString(),
        })
        .eq("id", id);
      resetIds.push({ id, balance });
    }
  }

  return NextResponse.json({ ok: true, cycle: key, reset: resetIds });
}

