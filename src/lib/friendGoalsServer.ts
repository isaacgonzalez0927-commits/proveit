import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeMemberProgress,
  displayNameFromProfile,
  type FriendGoalGroup,
  type FriendGoalMemberProgress,
} from "@/lib/friendGoals";
import type { ProofSubmission } from "@/types";

type ProfileRow = { id: string; username?: string | null; name?: string | null; email?: string | null };

function mapGoalFrequency(row: Record<string, unknown>) {
  const frequency = row.frequency === "weekly" ? "weekly" : "daily";
  const rawTimes = row.times_per_week;
  const timesPerWeek =
    typeof rawTimes === "number" && rawTimes >= 1 && rawTimes <= 7
      ? rawTimes
      : frequency === "daily"
        ? 7
        : 1;
  return { frequency, timesPerWeek };
}

export async function buildFriendGoalGroupsForUser(
  client: SupabaseClient,
  userId: string,
  origin: string
): Promise<FriendGoalGroup[]> {
  const { data: memberships, error: memErr } = await client
    .from("shared_goal_members")
    .select("shared_goal_id, goal_id, role")
    .eq("user_id", userId);

  if (memErr || !memberships?.length) return [];

  const sharedIds = [...new Set(memberships.map((m) => m.shared_goal_id as string))];
  const { data: sharedRows, error: sharedErr } = await client
    .from("shared_goals")
    .select("*")
    .in("id", sharedIds);

  if (sharedErr || !sharedRows?.length) return [];

  const groups: FriendGoalGroup[] = [];

  for (const shared of sharedRows) {
    const group = await buildFriendGoalGroup(client, shared as Record<string, unknown>, userId, origin);
    if (group) groups.push(group);
  }

  groups.sort((a, b) => a.title.localeCompare(b.title));
  return groups;
}

export async function buildFriendGoalGroup(
  client: SupabaseClient,
  shared: Record<string, unknown>,
  viewerUserId: string,
  origin: string
): Promise<FriendGoalGroup | null> {
  const sharedId = shared.id as string;
  const inviteCode = shared.invite_code as string;

  const { data: memberRows } = await client
    .from("shared_goal_members")
    .select("id, user_id, goal_id, role")
    .eq("shared_goal_id", sharedId);

  if (!memberRows?.length) return null;

  const userIds = memberRows.map((m) => m.user_id as string);
  const goalIds = memberRows.map((m) => m.goal_id as string);

  const [{ data: profiles }, { data: goals }, { data: submissions }] = await Promise.all([
    client.from("profiles").select("id, username, name, email").in("id", userIds),
    client.from("goals").select("id, frequency, times_per_week, is_on_break").in("id", goalIds),
    client
      .from("submissions")
      .select("goal_id, date, status")
      .in("goal_id", goalIds)
      .eq("status", "verified"),
  ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id as string, p as ProfileRow]));
  const goalById = new Map((goals ?? []).map((g) => [g.id as string, g as Record<string, unknown>]));
  const subsByGoal = new Map<string, Pick<ProofSubmission, "date" | "status">[]>();
  for (const sub of submissions ?? []) {
    const gid = sub.goal_id as string;
    const list = subsByGoal.get(gid) ?? [];
    list.push({
      date: sub.date as string,
      status: sub.status as ProofSubmission["status"],
    });
    subsByGoal.set(gid, list);
  }

  const freq = mapGoalFrequency(shared) as { frequency: "daily" | "weekly"; timesPerWeek: number };
  const yourMembership = memberRows.find((m) => m.user_id === viewerUserId);

  const members: FriendGoalMemberProgress[] = memberRows.map((m) => {
    const uid = m.user_id as string;
    const gid = m.goal_id as string;
    const profile = profileById.get(uid);
    const goalRow = goalById.get(gid);
    const subs = subsByGoal.get(gid) ?? [];
    const goalForProgress = goalRow
      ? {
          id: gid,
          frequency: (goalRow.frequency === "weekly" ? "weekly" : "daily") as "daily" | "weekly",
          timesPerWeek: mapGoalFrequency(goalRow).timesPerWeek as 1 | 2 | 3 | 4 | 5 | 6 | 7,
          isOnBreak: goalRow.is_on_break === true,
          createdAt: String(goalRow.created_at ?? new Date().toISOString()),
        }
      : {
          id: gid,
          frequency: freq.frequency,
          timesPerWeek: freq.timesPerWeek as 1 | 2 | 3 | 4 | 5 | 6 | 7,
          isOnBreak: false,
          createdAt: new Date().toISOString(),
        };
    const progress = computeMemberProgress(goalForProgress, subs);
    return {
      userId: uid,
      displayName: profile ? displayNameFromProfile(profile) : "Friend",
      goalId: gid,
      role: m.role === "owner" ? "owner" : "member",
      isYou: uid === viewerUserId,
      ...progress,
    };
  });

  members.sort((a, b) => {
    if (a.isYou) return -1;
    if (b.isYou) return 1;
    return a.displayName.localeCompare(b.displayName);
  });

  const base = origin.replace(/\/$/, "");
  return {
    id: sharedId,
    inviteCode,
    title: shared.title as string,
    timesPerWeek: freq.timesPerWeek,
    memberCount: memberRows.length,
    maxMembers: 2,
    yourGoalId: (yourMembership?.goal_id as string) ?? null,
    inviteUrl: `${base}/join/${encodeURIComponent(inviteCode)}`,
    members,
  };
}
