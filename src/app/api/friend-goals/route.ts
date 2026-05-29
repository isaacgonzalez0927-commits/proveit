import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildFriendGoalInviteUrl, generateFriendInviteCode } from "@/lib/friendGoals";
import { buildFriendGoalGroupsForUser } from "@/lib/friendGoalsServer";
import {
  findInviteForGoal,
  FRIEND_GOALS_SCHEMA_HINT,
  isFriendGoalsSchemaMissing,
} from "@/lib/friendGoalInviteLookup";
import { generateId } from "@/lib/generateId";

/** GET — list friend goal groups; ?goalId= returns invite for that goal if any. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ groups: [] });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const goalId = request.nextUrl.searchParams.get("goalId");
  const origin = request.nextUrl.origin;

  try {
    if (goalId) {
      const invite = await findInviteForGoal(supabase, user.id, goalId, origin);
      return NextResponse.json({ invite: invite ?? null });
    }

    const groups = await buildFriendGoalGroupsForUser(supabase, user.id, origin);
    return NextResponse.json({ groups });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load friend goals.";
    const status = isFriendGoalsSchemaMissing(message) ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/** POST — create a friend-goal invite for an existing goal (uses your session, not service role). */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const goalId = typeof body.goalId === "string" ? body.goalId.trim() : "";
  if (!goalId) {
    return NextResponse.json({ error: "goalId is required." }, { status: 400 });
  }

  const origin = request.nextUrl.origin;

  try {
    const existing = await findInviteForGoal(supabase, user.id, goalId, origin);
    if (existing) {
      return NextResponse.json({ invite: existing });
    }

    const { data: goal, error: goalErr } = await supabase
      .from("goals")
      .select("*")
      .eq("id", goalId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (goalErr) {
      const status = isFriendGoalsSchemaMissing(goalErr.message) ? 503 : 500;
      return NextResponse.json({ error: goalErr.message }, { status });
    }
    if (!goal) return NextResponse.json({ error: "Goal not found." }, { status: 404 });

    const sharedId = generateId();
    let inviteCode = generateFriendInviteCode();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { data: clash } = await supabase
        .from("shared_goals")
        .select("id")
        .eq("invite_code", inviteCode)
        .maybeSingle();
      if (!clash) break;
      inviteCode = generateFriendInviteCode();
    }

    const frequency = goal.frequency === "weekly" ? "weekly" : "daily";
    const { error: insertSharedErr } = await supabase.from("shared_goals").insert({
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
      const hint = isFriendGoalsSchemaMissing(insertSharedErr.message)
        ? FRIEND_GOALS_SCHEMA_HINT
        : insertSharedErr.message;
      return NextResponse.json({ error: hint }, { status: 503 });
    }

    const memberId = generateId();
    const { error: memberErr } = await supabase.from("shared_goal_members").insert({
      id: memberId,
      shared_goal_id: sharedId,
      user_id: user.id,
      goal_id: goalId,
      role: "owner",
    });

    if (memberErr) {
      await supabase.from("shared_goals").delete().eq("id", sharedId);
      const hint = isFriendGoalsSchemaMissing(memberErr.message)
        ? FRIEND_GOALS_SCHEMA_HINT
        : memberErr.message;
      return NextResponse.json({ error: hint }, { status: 503 });
    }

    return NextResponse.json({
      invite: {
        sharedGoalId: sharedId,
        inviteCode,
        inviteUrl: buildFriendGoalInviteUrl(origin, inviteCode),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create invite.";
    const status = isFriendGoalsSchemaMissing(message) ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
