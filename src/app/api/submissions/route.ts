import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof createClient>>>;

async function getGoalIdsForUser(supabase: SupabaseClient, userId: string): Promise<string[]> {
  const { data } = await supabase.from("goals").select("id").eq("user_id", userId);
  return (data ?? []).map((r) => r.id);
}

async function goalBelongsToUser(supabase: SupabaseClient, goalId: string, userId: string): Promise<boolean> {
  const { data } = await supabase.from("goals").select("id").eq("id", goalId).eq("user_id", userId).single();
  return !!data?.id;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ submissions: [] });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const goalId = searchParams.get("goalId");

  if (goalId) {
    const allowed = await goalBelongsToUser(supabase, goalId, user.id);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const goalIds = goalId ? [goalId] : await getGoalIdsForUser(supabase, user.id);
  if (goalIds.length === 0) return NextResponse.json({ submissions: [] });

  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .in("goal_id", goalIds)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const submissions = (data ?? []).map((row) => ({
    id: row.id,
    goalId: row.goal_id,
    date: row.date,
    imageDataUrl: row.image_data_url,
    status: row.status,
    aiFeedback: row.ai_feedback ?? undefined,
    verifiedAt: row.verified_at ?? undefined,
    createdAt: row.created_at,
  }));

  return NextResponse.json({ submissions });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id, goalId, date, imageDataUrl, status, aiFeedback, verifiedAt } = body;

  if (!goalId) return NextResponse.json({ error: "goalId is required" }, { status: 400 });
  const allowed = await goalBelongsToUser(supabase, goalId, user.id);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabase
    .from("submissions")
    .insert({
      id,
      goal_id: goalId,
      date,
      image_data_url: imageDataUrl,
      status: status ?? "pending",
      ai_feedback: aiFeedback ?? null,
      verified_at: verifiedAt ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    submission: {
      id: data.id,
      goalId: data.goal_id,
      date: data.date,
      imageDataUrl: data.image_data_url,
      status: data.status,
      aiFeedback: data.ai_feedback ?? undefined,
      verifiedAt: data.verified_at ?? undefined,
      createdAt: data.created_at,
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

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { data: sub } = await supabase.from("submissions").select("goal_id").eq("id", id).single();
  if (!sub?.goal_id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const allowed = await goalBelongsToUser(supabase, sub.goal_id, user.id);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const dbUpdates: Record<string, unknown> = {};
  if (updates.status != null) dbUpdates.status = updates.status;
  if (updates.aiFeedback != null) dbUpdates.ai_feedback = updates.aiFeedback;
  if (updates.verifiedAt != null) dbUpdates.verified_at = updates.verifiedAt;

  const { error } = await supabase
    .from("submissions")
    .update(dbUpdates)
    .eq("id", id);

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
  const goalId = searchParams.get("goalId");
  if (!id && !goalId) {
    return NextResponse.json({ error: "Missing id or goalId" }, { status: 400 });
  }

  if (goalId) {
    const allowed = await goalBelongsToUser(supabase, goalId, user.id);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } else if (id) {
    const { data: sub } = await supabase.from("submissions").select("goal_id").eq("id", id).single();
    if (!sub?.goal_id) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const allowed = await goalBelongsToUser(supabase, sub.goal_id, user.id);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let query = supabase.from("submissions").delete();
  if (id) query = query.eq("id", id);
  if (goalId) query = query.eq("goal_id", goalId);

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
