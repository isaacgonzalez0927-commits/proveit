import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  const goals = (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description ?? undefined,
    frequency: row.frequency,
    reminderTime: row.reminder_time ?? undefined,
    reminderDay: row.reminder_day ?? undefined,
    gracePeriod: (row as { grace_period?: string }).grace_period ?? undefined,
    createdAt: row.created_at,
    completedDates: row.completed_dates ?? [],
  }));

  return NextResponse.json({ goals });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id, title, description, frequency, reminderTime, reminderDay, gracePeriod } = body;

  const insertData: Record<string, unknown> = {
    id,
    user_id: user.id,
    title,
    description: description ?? null,
    frequency,
    reminder_time: reminderTime ?? null,
    reminder_day: reminderDay ?? null,
    completed_dates: [],
  };
  if (gracePeriod != null) insertData.grace_period = gracePeriod;

  const { data, error } = await supabase
    .from("goals")
    .insert(insertData)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    goal: {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      description: data.description ?? undefined,
      frequency: data.frequency,
      reminderTime: data.reminder_time ?? undefined,
      reminderDay: data.reminder_day ?? undefined,
      gracePeriod: (data as { grace_period?: string }).grace_period ?? undefined,
      createdAt: data.created_at,
      completedDates: data.completed_dates ?? [],
    },
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
