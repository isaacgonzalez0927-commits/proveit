import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeBuddyFriendCode } from "@/lib/buddyProfile";

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> }
) {
  const { code: raw } = await context.params;
  const code = normalizeBuddyFriendCode(raw ?? "");
  if (!code) {
    return NextResponse.json({ error: "Invalid code." }, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const { data, error } = await supabase.rpc("get_buddy_profile_by_friend_code", {
    p_code: code,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Friend link not found." }, { status: 404 });
  }

  return NextResponse.json({ preview: data });
}
