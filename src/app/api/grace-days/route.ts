import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGraceDayResetBalance } from "@/lib/subscriptionLimits";
import { normalizePlanId } from "@/types";
import { weekStartKey } from "@/lib/graceDays";

function mapEvent(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    goalId: row.goal_id as string,
    weekStart: row.week_start as string,
    missedDate: (row.missed_date as string | null) ?? undefined,
    usedAt: row.used_at as string,
    reason: (row.reason as string | null) ?? undefined,
    createdAt: row.created_at as string,
  };
}

export async function GET() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ balance: 0, events: [] });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("grace_day_balance")
    .eq("id", user.id)
    .maybeSingle();
  const { data } = await supabase
    .from("grace_day_events")
    .select("*")
    .eq("user_id", user.id)
    .order("used_at", { ascending: false })
    .limit(50);

  return NextResponse.json({
    balance: typeof profile?.grace_day_balance === "number" ? profile.grace_day_balance : 0,
    events: (data ?? []).map((row) => mapEvent(row as Record<string, unknown>)),
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const goalId = typeof body.goalId === "string" ? body.goalId : "";
  const missedDate = typeof body.missedDate === "string" ? body.missedDate : null;
  if (!goalId) return NextResponse.json({ error: "goalId is required" }, { status: 400 });

  const { data: goal } = await supabase
    .from("goals")
    .select("id")
    .eq("id", goalId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!goal?.id) return NextResponse.json({ error: "Goal not found." }, { status: 404 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, grace_day_balance")
    .eq("id", user.id)
    .maybeSingle();
  const plan = normalizePlanId(profile?.plan);
  const maxBalance = getGraceDayResetBalance(plan);
  const balance = typeof profile?.grace_day_balance === "number" ? profile.grace_day_balance : 0;
  if (maxBalance <= 0) return NextResponse.json({ error: "Streak Shields are a Pro feature." }, { status: 403 });
  if (balance <= 0) return NextResponse.json({ error: "No Streak Shields left this cycle." }, { status: 403 });

  const weekStart = typeof body.weekStart === "string" ? body.weekStart : weekStartKey();
  const existing = await supabase
    .from("grace_day_events")
    .select("id")
    .eq("user_id", user.id)
    .eq("goal_id", goalId)
    .eq("week_start", weekStart)
    .limit(1);
  if ((existing.data ?? []).length > 0) {
    return NextResponse.json({ error: "A Streak Shield already protects this goal this week." }, { status: 409 });
  }

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  const { data: inserted, error } = await supabase
    .from("grace_day_events")
    .insert({
      id,
      user_id: user.id,
      goal_id: goalId,
      week_start: weekStart,
      missed_date: missedDate,
      reason: "manual",
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase
    .from("profiles")
    .update({ grace_day_balance: Math.max(0, balance - 1), updated_at: new Date().toISOString() })
    .eq("id", user.id);

  return NextResponse.json({
    balance: Math.max(0, balance - 1),
    event: mapEvent(inserted as Record<string, unknown>),
  });
}

