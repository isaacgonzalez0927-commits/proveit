import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ profile: null });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ profile: null });

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({
      profile: {
        id: user.id,
        email: user.email ?? "",
        plan: "free",
        createdAt: user.created_at,
      },
    });
  }

  return NextResponse.json({
    profile: {
      id: data.id,
      email: data.email,
      plan: data.plan,
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
  const { plan } = body;

  if (plan && ["free", "pro", "premium"].includes(plan)) {
    await supabase
      .from("profiles")
      .update({ plan, updated_at: new Date().toISOString() })
      .eq("id", user.id);
  }

  return NextResponse.json({ ok: true });
}
