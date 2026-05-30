import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listBuddyDirectory } from "@/lib/buddyProfileServer";

export async function GET() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const buddies = await listBuddyDirectory(supabase, user.id);
  return NextResponse.json({ buddies });
}
