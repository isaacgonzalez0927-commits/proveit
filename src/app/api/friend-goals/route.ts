import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildFriendGoalInviteUrl,
  FRIEND_GOAL_MAX_MEMBERS,
  generateFriendInviteCode,
} from "@/lib/friendGoals";
import { buildFriendGoalGroupsForUser } from "@/lib/friendGoalsServer";
import { generateId } from "@/lib/store";

/** GET — list friend goal groups; ?goalId= returns invite for that goal if any. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ groups: [] });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Friend goals need SUPABASE_SERVICE_ROLE_KEY on the server." },
      { status: 503 }
    );
  }

  const goalId = request.nextUrl.searchParams.get("goalId");
  const origin = request.nextUrl.origin;

  if (goalId) {
    const { data: membership } = await admin
      .from("shared_goal_members")
      .select("shared_goal_id, shared_goals(invite_code)")
      .eq("user_id", user.id)
      .eq("goal_id", goalId)
      .maybeSingle();

    if (membership?.shared_goals) {
      const row = membership.shared_goals as { invite_code?: string };
      const code = row.invite_code;
      if (code) {
        return NextResponse.json({
          invite: {
            sharedGoalId: membership.shared_goal_id,
            inviteCode: code,
            inviteUrl: buildFriendGoalInviteUrl(origin, code),
          },
        });
      }
    }
    return NextResponse.json({ invite: null });
  }

  const groups = await buildFriendGoalGroupsForUser(admin, user.id, origin);
  return NextResponse.json({ groups });
}

/** POST — create a friend-goal invite for an existing goal. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Friend goals need SUPABASE_SERVICE_ROLE_KEY on the server." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const goalId = typeof body.goalId === "string" ? body.goalId.trim() : "";
  if (!goalId) {
    return NextResponse.json({ error: "goalId is required." }, { status: 400 });
  }

  const { data: goal, error: goalErr } = await supabase
    .from("goals")
    .select("*")
    .eq("id", goalId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (goalErr) return NextResponse.json({ error: goalErr.message }, { status: 500 });
  if (!goal) return NextResponse.json({ error: "Goal not found." }, { status: 404 });

  const { data: existingMember } = await admin
    .from("shared_goal_members")
    .select("shared_goal_id, shared_goals(invite_code)")
    .eq("user_id", user.id)
    .eq("goal_id", goalId)
    .maybeSingle();

  const origin = request.nextUrl.origin;
  if (existingMember?.shared_goals) {
    const row = existingMember.shared_goals as { invite_code?: string };
    const code = row.invite_code;
    if (code) {
      return NextResponse.json({
        invite: {
          sharedGoalId: existingMember.shared_goal_id,
          inviteCode: code,
          inviteUrl: buildFriendGoalInviteUrl(origin, code),
        },
      });
    }
  }

  const sharedId = generateId();
  let inviteCode = generateFriendInviteCode();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data: clash } = await admin
      .from("shared_goals")
      .select("id")
      .eq("invite_code", inviteCode)
      .maybeSingle();
    if (!clash) break;
    inviteCode = generateFriendInviteCode();
  }

  const frequency = goal.frequency === "weekly" ? "weekly" : "daily";
  const { error: insertSharedErr } = await admin.from("shared_goals").insert({
    id: sharedId,
    invite_code: inviteCode,
    created_by: user.id,
    title: goal.title,
    description: goal.description ?? null,
    frequency,
    times_per_week: goal.times_per_week ?? (frequency === "daily" ? 7 : 1),
    reminder_time: goal.reminder_time ?? null,
    reminder_days: goal.reminder_days ?? null,
    proof_suggestions: goal.proof_suggestions ?? null,
    proof_requirement: goal.proof_requirement ?? goal.title,
  });

  if (insertSharedErr) {
    return NextResponse.json({ error: insertSharedErr.message }, { status: 500 });
  }

  const memberId = generateId();
  const { error: memberErr } = await admin.from("shared_goal_members").insert({
    id: memberId,
    shared_goal_id: sharedId,
    user_id: user.id,
    goal_id: goalId,
    role: "owner",
  });

  if (memberErr) {
    await admin.from("shared_goals").delete().eq("id", sharedId);
    return NextResponse.json({ error: memberErr.message }, { status: 500 });
  }

  return NextResponse.json({
    invite: {
      sharedGoalId: sharedId,
      inviteCode,
      inviteUrl: buildFriendGoalInviteUrl(origin, inviteCode),
    },
  });
}
