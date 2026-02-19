import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function normalizeCompletedDates(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string");
  }
  return [];
}

function mapGoalRow(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    title: row.title as string,
    description: (row.description as string | null) ?? undefined,
    frequency: row.frequency as string,
    reminderTime: (row.reminder_time as string | null) ?? undefined,
    reminderDay: (row.reminder_day as number | null) ?? undefined,
    gracePeriod: (row.grace_period as string | null) ?? undefined,
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
  const { id, title, description, frequency, reminderTime, reminderDay, gracePeriod } = body;

  // Best-effort profile upsert for installs where the trigger wasn't present
  // when the account was created. Ignore if table/columns differ.
  try {
    await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email ?? "",
        plan: "free",
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
    reminder_day: reminderDay ?? null,
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
  if (updates.title != null) dbUpdates.title = updates.title;
  if (updates.description != null) dbUpdates.description = updates.description;
  if (updates.frequency != null) dbUpdates.frequency = updates.frequency;
  if (updates.reminderTime != null) dbUpdates.reminder_time = updates.reminderTime;
  if (updates.reminderDay != null) dbUpdates.reminder_day = updates.reminderDay;
  if (updates.gracePeriod != null) dbUpdates.grace_period = updates.gracePeriod;
  if (updates.completedDates != null) dbUpdates.completed_dates = updates.completedDates;

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
