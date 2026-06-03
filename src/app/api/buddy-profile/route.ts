import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveEffectivePlanForAccount } from "@/lib/accountAccess";
import { getBuddyProfileSettings } from "@/lib/buddyProfileServer";
import { sanitizeBuddyAvatarPlant, sanitizeBuddyProfileAccent } from "@/lib/buddyProfile";

function requestOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost && forwardedProto) {
    return `${forwardedProto === "https" ? "https" : "http"}://${forwardedHost}`;
  }
  const origin = request.headers.get("origin");
  if (origin) return origin;
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await getBuddyProfileSettings(
    supabase,
    user.id,
    requestOrigin(request),
    user.email
  );
  if (!settings) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  return NextResponse.json({ settings });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { data: current } = await supabase
    .from("profiles")
    .select("plan, email, contact_email")
    .eq("id", user.id)
    .maybeSingle();

  const plan = resolveEffectivePlanForAccount(current?.plan, current, user.email);
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    buddy_profile_visibility: "shared_goals_only",
  };

  if (body.avatarPlant !== undefined) {
    updates.buddy_avatar_plant = sanitizeBuddyAvatarPlant(body.avatarPlant, plan, user.id);
  }

  if (body.accentTheme !== undefined) {
    updates.buddy_profile_accent = sanitizeBuddyProfileAccent(body.accentTheme, plan);
  }

  const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const settings = await getBuddyProfileSettings(
    supabase,
    user.id,
    requestOrigin(request),
    user.email
  );
  return NextResponse.json({ ok: true, settings });
}
