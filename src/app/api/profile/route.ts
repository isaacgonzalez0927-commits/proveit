import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeUsername } from "@/lib/usernameAuth";

function normalizePlan(plan: unknown): "free" | "pro" | "premium" {
  if (plan === "premium") return "premium";
  if (plan === "pro") return "pro";
  return "free";
}

const EMAIL_FORMAT = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/;

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
        username: undefined as string | undefined,
        contactEmail: undefined as string | undefined,
        name: undefined as string | undefined,
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
      username: typeof data.username === "string" ? data.username : undefined,
      contactEmail: typeof data.contact_email === "string" ? data.contact_email : undefined,
      name: typeof data.name === "string" ? data.name : undefined,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const plan = body.plan;
  const planBilling = body.planBilling;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof plan === "string" && ["free", "pro", "premium"].includes(plan)) {
    updates.plan = plan;
  }
  if (typeof planBilling === "string" && ["monthly", "yearly"].includes(planBilling)) {
    updates.plan_billing = planBilling;
  }

  if (body.username !== undefined && body.username !== null) {
    if (typeof body.username !== "string") {
      return NextResponse.json({ error: "Invalid username." }, { status: 400 });
    }
    const { data: existing } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    if (existing?.username && String(existing.username).trim() !== "") {
      return NextResponse.json({ error: "Username is already set." }, { status: 400 });
    }
    const u = normalizeUsername(body.username);
    if (!u) {
      return NextResponse.json(
        { error: "Username must be 3–20 characters: letters, numbers, or underscore." },
        { status: 400 }
      );
    }
    updates.username = u;
  }

  if (body.contact_email !== undefined) {
    if (body.contact_email === null || body.contact_email === "") {
      updates.contact_email = null;
    } else if (typeof body.contact_email === "string") {
      const c = body.contact_email.trim().toLowerCase();
      if (!EMAIL_FORMAT.test(c)) {
        return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
      }
      updates.contact_email = c;
    } else {
      return NextResponse.json({ error: "Invalid contact email." }, { status: 400 });
    }
  }

  if (body.name !== undefined) {
    if (typeof body.name !== "string") {
      return NextResponse.json({ error: "Invalid name." }, { status: 400 });
    }
    const n = body.name.trim().slice(0, 80);
    updates.name = n || null;
  }

  const meaningfulKeys = Object.keys(updates).filter((k) => k !== "updated_at");
  if (meaningfulKeys.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { data: updatedRows, error: upError } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select("id");

  if (upError) {
    if (/profiles_username_unique|duplicate key|unique constraint/i.test(upError.message)) {
      return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
    }
    return NextResponse.json({ error: upError.message }, { status: 400 });
  }

  if (!updatedRows?.length) {
    const { error: insError } = await supabase.from("profiles").insert({
      id: user.id,
      email: user.email ?? "",
      ...updates,
    });
    if (insError) {
      if (/profiles_username_unique|duplicate key|unique constraint/i.test(insError.message)) {
        return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
      }
      return NextResponse.json({ error: insError.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}
