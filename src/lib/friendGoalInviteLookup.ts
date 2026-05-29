import type { SupabaseClient } from "@supabase/supabase-js";
import { buildFriendGoalInviteUrl } from "@/lib/friendGoals";

export interface FriendGoalInviteRow {
  id: string;
  invite_code: string;
  title: string;
  description?: string | null;
  frequency: string;
  times_per_week?: number | null;
  created_by: string;
  member_count: number;
}

export function isFriendGoalsSchemaMissing(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("shared_goals") ||
    m.includes("shared_goal_members") ||
    m.includes("get_friend_goal_invite")
  ) && (m.includes("does not exist") || m.includes("could not find") || m.includes("schema cache"));
}

export const FRIEND_GOALS_SCHEMA_HINT =
  "Friend goals database is not set up yet. In Supabase SQL Editor, run migrations 018_friend_goals.sql and 019_friend_goals_partner_access.sql.";

export async function lookupFriendGoalInvite(
  client: SupabaseClient,
  code: string
): Promise<FriendGoalInviteRow | null> {
  const { data, error } = await client.rpc("get_friend_goal_invite", {
    p_code: code.trim().toUpperCase(),
  });
  if (error) {
    if (isFriendGoalsSchemaMissing(error.message)) {
      throw new Error(FRIEND_GOALS_SCHEMA_HINT);
    }
    throw new Error(error.message);
  }
  if (!data || typeof data !== "object") return null;
  return data as FriendGoalInviteRow;
}

export async function findInviteForGoal(
  client: SupabaseClient,
  userId: string,
  goalId: string,
  origin: string
): Promise<{ sharedGoalId: string; inviteCode: string; inviteUrl: string } | null> {
  const { data: member, error: memberErr } = await client
    .from("shared_goal_members")
    .select("shared_goal_id")
    .eq("user_id", userId)
    .eq("goal_id", goalId)
    .maybeSingle();

  if (memberErr) {
    if (isFriendGoalsSchemaMissing(memberErr.message)) {
      throw new Error(FRIEND_GOALS_SCHEMA_HINT);
    }
    throw new Error(memberErr.message);
  }
  if (!member?.shared_goal_id) return null;

  const { data: shared, error: sharedErr } = await client
    .from("shared_goals")
    .select("id, invite_code")
    .eq("id", member.shared_goal_id)
    .maybeSingle();

  if (sharedErr) {
    if (isFriendGoalsSchemaMissing(sharedErr.message)) {
      throw new Error(FRIEND_GOALS_SCHEMA_HINT);
    }
    throw new Error(sharedErr.message);
  }
  if (!shared?.invite_code) return null;

  return {
    sharedGoalId: shared.id as string,
    inviteCode: shared.invite_code as string,
    inviteUrl: buildFriendGoalInviteUrl(origin, shared.invite_code as string),
  };
}
