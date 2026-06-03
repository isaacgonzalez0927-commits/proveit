import { NextRequest, NextResponse } from "next/server";
import { startOfWeek, subWeeks, format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { assertCronAuthorized } from "@/lib/cronAuth";
import { getEffectiveQuotaForWeek } from "@/lib/goalSchedule";
import type { Goal } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const unauthorized = assertCronAuthorized(request);
  if (unauthorized) return unauthorized;

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const now = new Date();
  const previousWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 0 });
  const previousWeekEnd = startOfWeek(now, { weekStartsOn: 0 });
  const weekStartKey = format(previousWeekStart, "yyyy-MM-dd");

  const { data: goals, error } = await supabase
    .from("goals")
    .select("id, user_id, title, times_per_week, frequency, created_at")
    .is("archived_at", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const checked = [];
  for (const goal of goals ?? []) {
    const row = goal as Record<string, unknown>;
    const goalId = String(row.id ?? "");
    const needed = getEffectiveQuotaForWeek(
      {
        timesPerWeek:
          typeof row.times_per_week === "number"
            ? (Math.max(1, Math.min(7, row.times_per_week)) as Goal["timesPerWeek"])
            : undefined,
        frequency: row.frequency === "daily" ? "daily" : "weekly",
        reminderDays: undefined,
        createdAt: String(row.created_at ?? new Date().toISOString()),
      },
      previousWeekStart
    );
    const { count } = await supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("goal_id", goalId)
      .eq("status", "verified")
      .gte("date", format(previousWeekStart, "yyyy-MM-dd"))
      .lt("date", format(previousWeekEnd, "yyyy-MM-dd"));
    const { count: graceCount } = await supabase
      .from("grace_day_events")
      .select("id", { count: "exact", head: true })
      .eq("goal_id", goalId)
      .eq("week_start", weekStartKey);
    checked.push({
      goalId,
      needed,
      verified: count ?? 0,
      graceDays: graceCount ?? 0,
      met: (count ?? 0) + (graceCount ?? 0) >= needed,
    });
  }

  return NextResponse.json({ ok: true, weekStart: weekStartKey, checked });
}

