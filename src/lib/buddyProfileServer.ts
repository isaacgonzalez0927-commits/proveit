import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeAchievementStats,
  countUnlockedAchievements,
  evaluateAllAchievements,
} from "@/lib/achievements";
import {
  buddyFriendLinkUrl,
  displayNameFromBuddyRow,
  generateBuddyFriendCode,
  normalizeBuddyVisibility,
  sanitizeBuddyAvatarPlant,
  sanitizeBuddyProfileAccent,
  type BuddyProfilePublic,
  type BuddyProfileSettings,
} from "@/lib/buddyProfile";
import type { GoalPlantVariant } from "@/lib/goalPlants";
import type { AccentTheme } from "@/lib/theme";
import type { PlanId } from "@/types";
import { resolveEffectivePlanForAccount } from "@/lib/accountAccess";
import type { Goal, GraceDayEvent, ProofSubmission, TimesPerWeek } from "@/types";
import { startOfWeek } from "date-fns";
import { safeParseISO } from "@/lib/dateUtils";

function mapGoalRow(row: Record<string, unknown>, userId: string): Goal {
  const rawTimes = row.times_per_week;
  const timesPerWeek =
    typeof rawTimes === "number" && rawTimes >= 1 && rawTimes <= 7
      ? (rawTimes as TimesPerWeek)
      : row.frequency === "daily"
        ? 7
        : 1;
  const completed = row.completed_dates;
  const completedDates = Array.isArray(completed)
    ? completed.filter((d): d is string => typeof d === "string")
    : [];

  return {
    id: String(row.id),
    userId,
    title: String(row.title ?? "Goal"),
    frequency: row.frequency === "weekly" ? "weekly" : "daily",
    timesPerWeek,
    isOnBreak: row.is_on_break === true,
    streakCarryover: typeof row.streak_carryover === "number" ? row.streak_carryover : 0,
    archivedAt: row.archived_at != null ? String(row.archived_at) : undefined,
    createdAt: row.created_at != null ? String(row.created_at) : new Date().toISOString(),
    completedDates,
  };
}

function mapSubmissionRows(rows: Array<Record<string, unknown>>): ProofSubmission[] {
  return rows.map((s) => ({
    id: typeof s.id === "string" ? s.id : `${s.goal_id}-${s.date}`,
    goalId: String(s.goal_id),
    date: String(s.date),
    imageDataUrl: "",
    createdAt:
      typeof s.created_at === "string" ? s.created_at : new Date().toISOString(),
    status: (s.status === "verified" || s.status === "rejected" ? s.status : "pending") as
      | "pending"
      | "verified"
      | "rejected",
  }));
}

type ProfileBuddyRow = {
  id: string;
  email?: string | null;
  contact_email?: string | null;
  name?: string | null;
  username?: string | null;
  plan?: string | null;
  buddy_avatar_plant?: number | null;
  buddy_profile_accent?: string | null;
  buddy_profile_visibility?: string | null;
  buddy_friend_code?: string | null;
};

function effectivePlanForRow(row: ProfileBuddyRow, authEmail?: string | null): PlanId {
  return resolveEffectivePlanForAccount(row.plan, row, authEmail);
}

export async function ensureBuddyFriendCode(
  client: SupabaseClient,
  userId: string
): Promise<string> {
  const { data } = await client
    .from("profiles")
    .select("buddy_friend_code")
    .eq("id", userId)
    .maybeSingle();

  const existing =
    typeof data?.buddy_friend_code === "string" ? data.buddy_friend_code.trim() : "";
  if (existing) return existing;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateBuddyFriendCode();
    const { error } = await client
      .from("profiles")
      .update({ buddy_friend_code: code, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .is("buddy_friend_code", null);
    if (!error) return code;
    if (!/duplicate|unique/i.test(error.message)) break;
  }

  const { data: again } = await client
    .from("profiles")
    .select("buddy_friend_code")
    .eq("id", userId)
    .maybeSingle();
  if (typeof again?.buddy_friend_code === "string" && again.buddy_friend_code.trim()) {
    return again.buddy_friend_code.trim();
  }
  throw new Error("Could not create friend link code.");
}

export async function canViewBuddyProfile(
  client: SupabaseClient,
  viewerId: string,
  targetId: string
): Promise<boolean> {
  if (viewerId === targetId) return true;
  const { data, error } = await client.rpc("can_view_buddy_profile", { p_target: targetId });
  if (error) {
    console.error("can_view_buddy_profile", error.message);
    return false;
  }
  return data === true;
}

function proofsThisWeek(submissions: Pick<ProofSubmission, "date" | "status">[]): number {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  return submissions.filter((s) => {
    if (s.status !== "verified") return false;
    const d = safeParseISO(s.date);
    return d && d >= weekStart;
  }).length;
}

async function sharedGoalTitlesBetween(
  client: SupabaseClient,
  viewerId: string,
  targetId: string
): Promise<string[]> {
  const { data: viewerMemberships } = await client
    .from("shared_goal_members")
    .select("shared_goal_id")
    .eq("user_id", viewerId);
  if (!viewerMemberships?.length) return [];

  const sharedIds = viewerMemberships.map((m) => m.shared_goal_id as string);
  const { data: partnerMemberships } = await client
    .from("shared_goal_members")
    .select("shared_goal_id")
    .eq("user_id", targetId)
    .in("shared_goal_id", sharedIds);

  if (!partnerMemberships?.length) return [];
  const overlap = new Set(partnerMemberships.map((m) => m.shared_goal_id as string));
  const { data: sharedRows } = await client
    .from("shared_goals")
    .select("title")
    .in("id", [...overlap]);
  return (sharedRows ?? []).map((r) => String(r.title)).filter(Boolean);
}

export async function buildBuddyProfilePublic(
  client: SupabaseClient,
  row: ProfileBuddyRow,
  viewerId: string,
  origin: string,
  viewerAuthEmail?: string | null
): Promise<BuddyProfilePublic | null> {
  const allowed = await canViewBuddyProfile(client, viewerId, row.id);
  if (!allowed) return null;

  const authEmail = viewerId === row.id ? viewerAuthEmail : undefined;
  const plan = effectivePlanForRow(row, authEmail);
  const avatarPlant = sanitizeBuddyAvatarPlant(row.buddy_avatar_plant, plan, row.id) as GoalPlantVariant;
  const accentTheme = sanitizeBuddyProfileAccent(row.buddy_profile_accent, plan) as AccentTheme;
  const visibility = normalizeBuddyVisibility(row.buddy_profile_visibility);

  const { data: goals } = await client
    .from("goals")
    .select(
      "id, title, frequency, times_per_week, is_on_break, streak_carryover, completed_dates, archived_at, created_at"
    )
    .eq("user_id", row.id)
    .is("archived_at", null);

  const goalList = (goals ?? []).map((g) => mapGoalRow(g as Record<string, unknown>, row.id));
  const goalIds = goalList.map((g) => g.id);

  const [{ data: submissions }, { data: graceEvents }] = await Promise.all([
    goalIds.length
      ? client.from("submissions").select("id, goal_id, date, status").in("goal_id", goalIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    client.from("grace_day_events").select("*").eq("user_id", row.id),
  ]);

  const subs = mapSubmissionRows((submissions ?? []) as Array<Record<string, unknown>>);
  const grace = (graceEvents ?? []) as GraceDayEvent[];

  const subsByGoal = (goalId: string) => subs.filter((s) => s.goalId === goalId);

  const stats = computeAchievementStats(goalList, subs, grace, subsByGoal);
  const progress = evaluateAllAchievements(stats, plan, subs);
  const sharedGoalTitles =
    viewerId === row.id ? [] : await sharedGoalTitlesBetween(client, viewerId, row.id);

  const friendCode =
    visibility === "friend_link" && viewerId === row.id && row.buddy_friend_code
      ? String(row.buddy_friend_code)
      : undefined;

  return {
    userId: row.id,
    displayName: displayNameFromBuddyRow(row),
    username: typeof row.username === "string" ? row.username : undefined,
    avatarPlant,
    accentTheme,
    visibility,
    friendCode,
    isYou: viewerId === row.id,
    stats: {
      activeGoals: stats.activeGoals,
      unlockedAchievements: countUnlockedAchievements(progress),
      maxStreak: stats.maxStreak,
      proofsThisWeek: proofsThisWeek(subs),
    },
    sharedGoalTitles,
  };
}

export async function getBuddyProfileSettings(
  client: SupabaseClient,
  userId: string,
  origin: string,
  authEmail?: string | null
): Promise<BuddyProfileSettings | null> {
  const { data, error } = await client
    .from("profiles")
    .select(
      "id, email, contact_email, plan, buddy_avatar_plant, buddy_profile_accent, buddy_profile_visibility, buddy_friend_code"
    )
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as ProfileBuddyRow;
  const plan = effectivePlanForRow(row, authEmail);

  return {
    avatarPlant: sanitizeBuddyAvatarPlant(row.buddy_avatar_plant, plan, userId),
    accentTheme: sanitizeBuddyProfileAccent(row.buddy_profile_accent, plan),
    visibility: "shared_goals_only",
    friendCode: null,
    friendLinkUrl: null,
  };
}

export async function connectBuddyByFriendCode(
  client: SupabaseClient,
  viewerId: string,
  code: string
): Promise<{ ok: true; profile: BuddyProfilePublic } | { ok: false; error: string }> {
  const normalized = code.trim().toUpperCase();
  const { data: owner, error: ownerErr } = await client
    .from("profiles")
    .select(
      "id, email, contact_email, name, username, plan, buddy_avatar_plant, buddy_profile_accent, buddy_profile_visibility, buddy_friend_code"
    )
    .eq("buddy_friend_code", normalized)
    .maybeSingle();

  if (ownerErr || !owner) {
    return { ok: false, error: "Friend link not found or expired." };
  }

  const ownerRow = owner as ProfileBuddyRow;
  if (normalizeBuddyVisibility(ownerRow.buddy_profile_visibility) !== "friend_link") {
    return { ok: false, error: "This buddy is not accepting friend links right now." };
  }

  if (ownerRow.id === viewerId) {
    return { ok: false, error: "That is your own friend link." };
  }

  const userA = viewerId < ownerRow.id ? viewerId : ownerRow.id;
  const userB = viewerId < ownerRow.id ? ownerRow.id : viewerId;

  const { error: insErr } = await client.from("buddy_connections").insert({ user_a: userA, user_b: userB });

  if (insErr && !/duplicate|unique/i.test(insErr.message)) {
    return { ok: false, error: insErr.message };
  }

  const profile = await buildBuddyProfilePublic(
    client,
    ownerRow,
    viewerId,
    "",
    undefined
  );
  if (!profile) {
    return { ok: false, error: "Connected, but could not load profile." };
  }

  return { ok: true, profile };
}

export async function listBuddyDirectory(
  client: SupabaseClient,
  userId: string
): Promise<Array<{ userId: string; displayName: string; avatarPlant: GoalPlantVariant; accentTheme: AccentTheme }>> {
  const [{ data: partners }, { data: connections }] = await Promise.all([
    client.rpc("friend_partner_user_ids"),
    client.rpc("buddy_connected_user_ids"),
  ]);

  const ids = new Set<string>();
  for (const id of normalizeUuidList(partners)) {
    if (id !== userId) ids.add(id);
  }
  for (const id of normalizeUuidList(connections)) {
    if (id !== userId) ids.add(id);
  }

  if (ids.size === 0) return [];

  const { data: profiles } = await client
    .from("profiles")
    .select("id, name, username, plan, buddy_avatar_plant, buddy_profile_accent")
    .in("id", [...ids]);

  const out: Array<{
    userId: string;
    displayName: string;
    avatarPlant: GoalPlantVariant;
    accentTheme: AccentTheme;
  }> = [];

  for (const row of profiles ?? []) {
    const r = row as ProfileBuddyRow;
    const allowed = await canViewBuddyProfile(client, userId, r.id);
    if (!allowed) continue;
    const plan = effectivePlanForRow(r, undefined);
    out.push({
      userId: r.id,
      displayName: displayNameFromBuddyRow(r),
      avatarPlant: sanitizeBuddyAvatarPlant(r.buddy_avatar_plant, plan, r.id),
      accentTheme: sanitizeBuddyProfileAccent(r.buddy_profile_accent, plan),
    });
  }

  out.sort((a, b) => a.displayName.localeCompare(b.displayName));
  return out;
}

function normalizeUuidList(data: unknown): string[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.filter((v): v is string => typeof v === "string" && v.length > 0);
  }
  return [];
}
