import { NextRequest, NextResponse } from "next/server";
import { getDay } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { assertCronAuthorized } from "@/lib/cronAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function urgencyLevel(remainingDays: number, remainingProofs: number): "normal" | "high" | "critical" {
  if (remainingProofs <= 0) return "normal";
  if (remainingDays <= 1 && remainingProofs > 0) return "critical";
  if (remainingProofs >= remainingDays) return "high";
  return "normal";
}

export async function GET(request: NextRequest) {
  const unauthorized = assertCronAuthorized(request);
  if (unauthorized) return unauthorized;

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  const now = new Date();
  const remainingDays = Math.max(0, 6 - getDay(now));

  const { data: goals, error } = await supabase
    .from("goals")
    .select("id, user_id, title, times_per_week, frequency")
    .is("archived_at", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const escalations = [];
  for (const goal of goals ?? []) {
    const row = goal as Record<string, unknown>;
    const goalId = String(row.id ?? "");
    const needed =
      typeof row.times_per_week === "number"
        ? Math.max(1, Math.min(7, row.times_per_week))
        : row.frequency === "daily"
          ? 7
          : 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const { count } = await supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("goal_id", goalId)
      .eq("status", "verified")
      .gte("date", weekStart.toISOString().slice(0, 10));
    const uploaded = count ?? 0;
    const remainingProofs = Math.max(0, needed - uploaded);
    escalations.push({
      goalId,
      userId: row.user_id,
      title: row.title,
      uploaded,
      needed,
      remainingDays,
      remainingProofs,
      urgency: urgencyLevel(remainingDays, remainingProofs),
    });
  }

  return NextResponse.json({ ok: true, escalations });
}

