import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildBuddyProfilePublic } from "@/lib/buddyProfileServer";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  const { userId } = await context.params;
  if (!userId) {
    return NextResponse.json({ error: "Missing user id." }, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: row, error } = await supabase
    .from("profiles")
    .select(
      "id, name, username, plan, buddy_avatar_plant, buddy_profile_accent, buddy_profile_visibility, buddy_friend_code"
    )
    .eq("id", userId)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  const origin =
    request.headers.get("origin") ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  const profile = await buildBuddyProfilePublic(supabase, row, user.id, origin);
  if (!profile) {
    return NextResponse.json({ error: "You cannot view this buddy profile." }, { status: 403 });
  }

  return NextResponse.json({ profile });
}
