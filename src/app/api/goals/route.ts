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
  const reminderDay = row.reminder_day != null ? (row.reminder_day as number) : undefined;
  const reminderDays = normalizeReminderDays(row.reminder_days) ?? (typeof reminderDay === "number" ? [reminderDay] : undefined);
  const frequency = row.frequency as string;
  return {
    id: row.id as string,
    userId: row.user_id as string,
    title: row.title as string,
    description: (row.description as string | null) ?? undefined,
    frequency: frequency ?? "daily",
    reminderTime: (row.reminder_time as string | null) ?? undefined,
    reminderDay,
    reminderDays: frequency === "daily" ? undefined : reminderDays,
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

  const isDaily = frequency === "daily";
  const reminderDayVal = reminderDay ?? (Array.isArray(reminderDays) && reminderDays.length > 0 ? reminderDays[0] : null);
  const reminderDaysVal = Array.isArray(reminderDays) && reminderDays.length > 0 ? reminderDays : null;

  // Minimal columns that exist in the base goals table (no reminder_day, reminder_days, grace_period).
  const minimalInsert: Record<string, unknown> = {
    id,
    user_id: user.id,
    title,
    description: description ?? null,
    frequency,
    reminder_time: reminderTime ?? null,
  };

  // Daily: only use minimal columns so we never touch reminder_day/reminder_days (avoids "could not find reminder day" on strict or older DBs).
  // Weekly: add reminder columns if present in schema.
  const weeklyInsert: Record<string, unknown> = { ...minimalInsert, reminder_day: reminderDayVal, reminder_days: reminderDaysVal };
  const fullInsert: Record<string, unknown> = { ...minimalInsert, grace_period: gracePeriod ?? "eod" };
  if (!isDaily) {
    fullInsert.reminder_day = reminderDayVal;
    fullInsert.reminder_days = reminderDaysVal;
  }

  const insertGoal = async (payload: Record<string, unknown>) => {
    return supabase.from("goals").insert(payload).select().single();
  };

  let data: Record<string, unknown> | null = null;
  let error: { message: string } | null = null;

  if (isDaily) {
    // Daily: try minimal first (no grace_period, no reminder columns)
    let result = await insertGoal(minimalInsert);
    if (result.error) {
      if (/grace_period|grace period|reminder|does not exist/i.test(result.error.message ?? "")) {
        result = await insertGoal({ ...minimalInsert, grace_period: gracePeriod ?? "eod" });
      }
      if (result.error) {
        error = result.error;
        data = null;
      } else {
        data = result.data as Record<string, unknown>;
      }
    } else {
      data = result.data as Record<string, unknown>;
    }
  } else {
    // Weekly: try full (with grace_period and reminder columns), then strip grace_period if DB doesn't have it
    let result = await insertGoal(fullInsert);
    if (result.error) {
      const msg = result.error.message ?? "";
      if (/grace_period|grace period|does not exist/i.test(msg)) {
        result = await insertGoal(weeklyInsert);
      }
      if (result.error) {
        const retryMsg = result.error.message ?? "";
        if (/reminder_day|reminder_days|does not exist/i.test(retryMsg)) {
          result = await insertGoal(minimalInsert);
        }
        if (result.error) {
          error = result.error;
        } else {
          data = result.data as Record<string, unknown>;
        }
      } else {
        data = result.data as Record<string, unknown>;
      }
    } else {
      data = result.data as Record<string, unknown>;
    }
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Insert failed" }, { status: 500 });

  const mapped = mapGoalRow(data);
  return NextResponse.json({ goal: mapped });
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
