import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function normalizePlan(plan: unknown): "free" | "pro" {
  return plan === "pro" || plan === "premium" ? "pro" : "free";
}

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
        planBilling: "monthly",
        createdAt: user.created_at,
      },
    });
  }

  return NextResponse.json({
    profile: {
      id: data.id,
      email: data.email,
      plan: normalizePlan(data.plan),
      planBilling: data.plan_billing ?? "monthly",
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
  const { plan, planBilling } = body;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (plan && ["free", "pro"].includes(plan)) {
    updates.plan = plan;
  }
  if (planBilling && ["monthly", "yearly"].includes(planBilling)) {
    updates.plan_billing = planBilling;
  }
  if (Object.keys(updates).length > 1) {
    await supabase.from("profiles").update(updates).eq("id", user.id);
  }

  return NextResponse.json({ ok: true });
}
