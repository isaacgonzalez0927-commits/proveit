import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ submissions: [] });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const goalId = searchParams.get("goalId");

  let query = supabase
    .from("submissions")
    .select("*")
    .order("created_at", { ascending: false });

  if (goalId) query = query.eq("goal_id", goalId);

  const { data, error } = await query;

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
