import { format } from "date-fns";
import { countVerifiedInCalendarWeek } from "@/lib/goalDue";
import { getEffectiveQuotaForWeek } from "@/lib/goalSchedule";
import { extractCalendarDateKey } from "@/lib/dateUtils";
import type { Goal, ProofSubmission } from "@/types";

export const FRIEND_GOAL_MAX_MEMBERS = 2;

export interface FriendGoalMemberProgress {
  userId: string;
  displayName: string;
  goalId: string;
  role: "owner" | "member";
  provedToday: boolean;
  weekDone: number;
  weekTarget: number;
  isYou: boolean;
}

export interface FriendGoalGroup {
  id: string;
  inviteCode: string;
  title: string;
  timesPerWeek: number;
  memberCount: number;
  maxMembers: number;
  yourGoalId: string | null;
  inviteUrl: string;
  members: FriendGoalMemberProgress[];
}

export function friendGoalInvitePath(code: string): string {
  return `/join/${encodeURIComponent(code)}`;
}

export function buildFriendGoalInviteUrl(origin: string, code: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}${friendGoalInvitePath(code)}`;
}

export function generateFriendInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  let code = "";
  for (let i = 0; i < 8; i += 1) {
    code += alphabet[bytes[i]! % alphabet.length]!;
  }
  return code;
}

export function displayNameFromProfile(row: {
  username?: string | null;
  name?: string | null;
  email?: string | null;
}): string {
  if (row.username && String(row.username).trim()) return String(row.username).trim();
  if (row.name && String(row.name).trim()) return String(row.name).trim();
  const email = row.email ? String(row.email) : "";
  const local = email.split("@")[0];
  return local?.trim() || "Friend";
}

type GoalRow = Pick<Goal, "id" | "frequency" | "timesPerWeek" | "isOnBreak" | "createdAt">;

export function computeMemberProgress(
  goal: GoalRow,
  submissions: Pick<ProofSubmission, "date" | "status">[],
  todayStr = format(new Date(), "yyyy-MM-dd")
): Pick<FriendGoalMemberProgress, "provedToday" | "weekDone" | "weekTarget"> {
  const now = new Date();
  const weekTarget = getEffectiveQuotaForWeek(goal as Goal, now);
  const verified = submissions.filter((s) => s.status === "verified");
  const provedToday = verified.some((s) => extractCalendarDateKey(s.date) === todayStr);
  const weekDone = countVerifiedInCalendarWeek(verified, new Date());
  return { provedToday, weekDone, weekTarget };
}

export function friendGoalShareMessage(title: string, inviteUrl: string): string {
  return `Join me on Proveit for "${title}" — we'll track the same goal and see each other's progress.\n${inviteUrl}`;
}
