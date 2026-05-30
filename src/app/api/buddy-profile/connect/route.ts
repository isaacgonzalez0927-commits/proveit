import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { connectBuddyByFriendCode } from "@/lib/buddyProfileServer";
import { normalizeBuddyFriendCode } from "@/lib/buddyProfile";

export async function POST(request: NextRequest) {
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

  const code =
    typeof body.code === "string" ? normalizeBuddyFriendCode(body.code) : null;
  if (!code) {
    return NextResponse.json({ error: "Invalid friend link code." }, { status: 400 });
  }

  const result = await connectBuddyByFriendCode(supabase, user.id, code);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, profile: result.profile });
}
