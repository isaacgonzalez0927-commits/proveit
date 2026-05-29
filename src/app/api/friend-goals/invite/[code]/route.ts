import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildFriendGoalInviteUrl, displayNameFromProfile, FRIEND_GOAL_MAX_MEMBERS } from "@/lib/friendGoals";

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

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Friend goals are not configured on this server." },
      { status: 503 }
    );
  }

  const { data: shared, error } = await admin
    .from("shared_goals")
    .select("*")
    .eq("invite_code", code)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!shared) return NextResponse.json({ error: "Invite not found." }, { status: 404 });

  const { data: members } = await admin
    .from("shared_goal_members")
    .select("user_id, role")
    .eq("shared_goal_id", shared.id);

  const memberCount = members?.length ?? 0;
  const isFull = memberCount >= FRIEND_GOAL_MAX_MEMBERS;

  const { data: ownerProfile } = await admin
    .from("profiles")
    .select("username, name, email")
    .eq("id", shared.created_by)
    .maybeSingle();

  let alreadyJoined = false;
  const supabase = await createClient();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      alreadyJoined = Boolean(members?.some((m) => m.user_id === user.id));
    }
  }

  const timesPerWeek =
    typeof shared.times_per_week === "number" ? shared.times_per_week : shared.frequency === "daily" ? 7 : 1;

  return NextResponse.json({
    invite: {
      code,
      title: shared.title,
      description: shared.description ?? undefined,
      timesPerWeek,
      frequency: shared.frequency,
      ownerName: ownerProfile ? displayNameFromProfile(ownerProfile) : "Someone",
      memberCount,
      maxMembers: FRIEND_GOAL_MAX_MEMBERS,
      isFull,
      alreadyJoined,
      inviteUrl: buildFriendGoalInviteUrl(request.nextUrl.origin, code),
    },
  });
}
