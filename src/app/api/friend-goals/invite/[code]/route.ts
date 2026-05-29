import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildFriendGoalInviteUrl, displayNameFromProfile, FRIEND_GOAL_MAX_MEMBERS } from "@/lib/friendGoals";
import { lookupFriendGoalInvite } from "@/lib/friendGoalInviteLookup";
import { createAdminClient } from "@/lib/supabase/admin";

/** Public invite preview (auth optional). */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: rawCode } = await params;
  const code = rawCode?.trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ error: "Invalid invite." }, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });
  }

  try {
    const row = await lookupFriendGoalInvite(supabase, code);
    if (!row) return NextResponse.json({ error: "Invite not found." }, { status: 404 });

    const memberCount = row.member_count ?? 0;
    const isFull = memberCount >= FRIEND_GOAL_MAX_MEMBERS;

    let ownerName = "Someone";
    const admin = createAdminClient();
    const profileClient = admin ?? supabase;
    const { data: ownerProfile } = await profileClient
      .from("profiles")
      .select("username, name, email")
      .eq("id", row.created_by)
      .maybeSingle();
    if (ownerProfile) ownerName = displayNameFromProfile(ownerProfile);

    let alreadyJoined = false;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: members } = await supabase
        .from("shared_goal_members")
        .select("user_id")
        .eq("shared_goal_id", row.id);
      alreadyJoined = Boolean(members?.some((m) => m.user_id === user.id));
    }

    const timesPerWeek =
      typeof row.times_per_week === "number" ? row.times_per_week : row.frequency === "daily" ? 7 : 1;

    return NextResponse.json({
      invite: {
        code,
        title: row.title,
        description: row.description ?? undefined,
        timesPerWeek,
        ownerName,
        memberCount,
        maxMembers: FRIEND_GOAL_MAX_MEMBERS,
        isFull,
        alreadyJoined,
        inviteUrl: buildFriendGoalInviteUrl(request.nextUrl.origin, code),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load invite.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
