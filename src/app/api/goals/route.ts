import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function normalizeCompletedDates(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string");
  }
  return [];
}

function normalizeReminderDays(value: unknown): number[] | undefined {
  if (Array.isArray(value)) {
    const nums = value.filter((v): v is number => typeof v === "number" && v >= 0 && v <= 6);
    return nums.length > 0 ? nums.sort((a, b) => a - b) : undefined;
  }
  return undefined;
}

function mapGoalRow(row: Record<string, unknown>) {
  const reminderDay = (row.reminder_day as number | null) ?? undefined;
  const reminderDays = normalizeReminderDays(row.reminder_days) ?? (typeof reminderDay === "number" ? [reminderDay] : undefined);
  return {
    id: row.id as string,
    userId: row.user_id as string,
    title: row.title as string,
    description: (row.description as string | null) ?? undefined,
    frequency: row.frequency as string,
    reminderTime: (row.reminder_time as string | null) ?? undefined,
    reminderDay,
    reminderDays,
    gracePeriod: (row.grace_period as string | null) ?? undefined,
    isOnBreak: row.is_on_break === true,
    breakStartedAt: (row.break_started_at as string | null) ?? undefined,
    breakStreakSnapshot: (row.break_streak_snapshot as number | null) ?? undefined,
    streakCarryover: (row.streak_carryover as number | null) ?? undefined,
    createdAt: row.created_at as string,
    completedDates: normalizeCompletedDates(row.completed_dates),
  };
}

export async function GET() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ goals: [] });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const goals = (data ?? []).map((row) => mapGoalRow(row as Record<string, unknown>));

  return NextResponse.json({ goals });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id, title, description, frequency, reminderTime, reminderDay, reminderDays, gracePeriod } = body;

  // Ensure profile row exists (e.g. if trigger missed it). Do not overwrite plan.
  try {
    await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email ?? "",
      },
      { onConflict: "id" }
    );
  } catch {
    // ignore
  }

  const baseInsertData: Record<string, unknown> = {
    id,
    user_id: user.id,
    title,
    description: description ?? null,
    frequency,
    reminder_time: reminderTime ?? null,
    reminder_day: reminderDay ?? (Array.isArray(reminderDays) && reminderDays.length > 0 ? reminderDays[0] : null),
    reminder_days: Array.isArray(reminderDays) && reminderDays.length > 0 ? reminderDays : null,
  };

  const insertGoal = async (includeGracePeriod: boolean) => {
    const insertData = { ...baseInsertData };
    if (includeGracePeriod && gracePeriod != null) {
      insertData.grace_period = gracePeriod;
    }
    return supabase
      .from("goals")
      .insert(insertData)
      .select()
      .single();
  };

  let { data, error } = await insertGoal(true);
  if (error && /grace_period/i.test(error.message ?? "")) {
    // Some deployments may not have run the grace_period migration yet.
    // Retry without that column to keep goal creation functional.
    ({ data, error } = await insertGoal(false));
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const mapped = mapGoalRow(data as Record<string, unknown>);

  return NextResponse.json({
    goal: mapped,
  });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id, ...updates } = body;

  const dbUpdates: Record<string, unknown> = {};
  if ("title" in updates) dbUpdates.title = updates.title;
  if ("description" in updates) dbUpdates.description = updates.description ?? null;
  if ("frequency" in updates) dbUpdates.frequency = updates.frequency;
  if ("reminderTime" in updates) dbUpdates.reminder_time = updates.reminderTime ?? null;
  if ("reminderDay" in updates) dbUpdates.reminder_day = updates.reminderDay ?? null;
  if ("reminderDays" in updates) {
    const rd = updates.reminderDays;
    dbUpdates.reminder_days = Array.isArray(rd) && rd.length > 0 ? rd : null;
  }
  if ("gracePeriod" in updates) dbUpdates.grace_period = updates.gracePeriod ?? null;
  if ("completedDates" in updates) dbUpdates.completed_dates = updates.completedDates ?? [];
  if ("isOnBreak" in updates) dbUpdates.is_on_break = updates.isOnBreak === true;
  if ("breakStartedAt" in updates) dbUpdates.break_started_at = updates.breakStartedAt ?? null;
  if ("breakStreakSnapshot" in updates) {
    dbUpdates.break_streak_snapshot = updates.breakStreakSnapshot ?? null;
  }
  if ("streakCarryover" in updates) dbUpdates.streak_carryover = updates.streakCarryover ?? null;

  if (Object.keys(dbUpdates).length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase
    .from("goals")
    .update(dbUpdates)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await supabase
    .from("goals")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
