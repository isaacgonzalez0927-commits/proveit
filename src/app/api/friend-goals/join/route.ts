import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FRIEND_GOAL_MAX_MEMBERS } from "@/lib/friendGoals";
import { buildFriendGoalGroup } from "@/lib/friendGoalsServer";
import { generateId } from "@/lib/store";
import { getMaxGoalsForPlan } from "@/lib/subscriptionLimits";
import { normalizePlanId } from "@/types";
import { proofSuggestionsForStorage } from "@/lib/proofSuggestions";

/** POST — accept a friend-goal invite and create a linked goal. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to join this goal." }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Friend goals need SUPABASE_SERVICE_ROLE_KEY on the server." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!code) {
    return NextResponse.json({ error: "Invite code is required." }, { status: 400 });
  }

  const { data: shared, error: sharedErr } = await admin
    .from("shared_goals")
    .select("*")
    .eq("invite_code", code)
    .maybeSingle();

  if (sharedErr) return NextResponse.json({ error: sharedErr.message }, { status: 500 });
  if (!shared) return NextResponse.json({ error: "Invite not found." }, { status: 404 });

  const { data: members } = await admin
    .from("shared_goal_members")
    .select("user_id, goal_id")
    .eq("shared_goal_id", shared.id);

  if (members?.some((m) => m.user_id === user.id)) {
    const group = await buildFriendGoalGroup(admin, shared, user.id, request.nextUrl.origin);
    return NextResponse.json({
      alreadyJoined: true,
      group,
      yourGoalId: members.find((m) => m.user_id === user.id)?.goal_id,
    });
  }

  if ((members?.length ?? 0) >= FRIEND_GOAL_MAX_MEMBERS) {
    return NextResponse.json({ error: "This friend goal is full." }, { status: 409 });
  }

  const plan = normalizePlanId(
    (await supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle()).data?.plan
  );
  const { count: goalCount } = await supabase
    .from("goals")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("archived_at", null);

  const maxGoals = getMaxGoalsForPlan(plan);
  if (maxGoals !== -1 && (goalCount ?? 0) >= maxGoals) {
    return NextResponse.json(
      { error: "Goal limit reached for your plan. Upgrade or archive a goal to join." },
      { status: 403 }
    );
  }

  const frequency = shared.frequency === "weekly" ? "weekly" : "daily";
  const timesPerWeek =
    typeof shared.times_per_week === "number" && shared.times_per_week >= 1 && shared.times_per_week <= 7
      ? shared.times_per_week
      : frequency === "daily"
        ? 7
        : 1;
  const isDaily = timesPerWeek >= 7;
  const proofRequirement =
    typeof shared.proof_requirement === "string" && shared.proof_requirement.trim()
      ? shared.proof_requirement.trim()
      : (shared.title as string);
  let proofSuggestions = shared.proof_suggestions;
  if (!Array.isArray(proofSuggestions) || proofSuggestions.length === 0) {
    proofSuggestions = proofSuggestionsForStorage(proofRequirement);
  }

  const newGoalId = generateId();
  const insertPayload: Record<string, unknown> = {
    id: newGoalId,
    user_id: user.id,
    title: shared.title,
    description: shared.description ?? null,
    frequency: isDaily ? "daily" : frequency,
    reminder_time: shared.reminder_time ?? "09:00",
    reminder_is_active: true,
    times_per_week: timesPerWeek,
    proof_suggestions: proofSuggestions,
    proof_requirement: proofRequirement,
  };
  if (!isDaily && Array.isArray(shared.reminder_days) && shared.reminder_days.length > 0) {
    insertPayload.reminder_day = shared.reminder_days[0];
    insertPayload.reminder_days = shared.reminder_days;
  }

  const { error: goalInsertErr } = await supabase.from("goals").insert(insertPayload);
  if (goalInsertErr) {
    return NextResponse.json({ error: goalInsertErr.message }, { status: 500 });
  }

  const memberId = generateId();
  const { error: memberErr } = await admin.from("shared_goal_members").insert({
    id: memberId,
    shared_goal_id: shared.id,
    user_id: user.id,
    goal_id: newGoalId,
    role: "member",
  });

  if (memberErr) {
    await supabase.from("goals").delete().eq("id", newGoalId);
    return NextResponse.json({ error: memberErr.message }, { status: 500 });
  }

  const group = await buildFriendGoalGroup(admin, shared, user.id, request.nextUrl.origin);
  return NextResponse.json({
    joined: true,
    yourGoalId: newGoalId,
    group,
  });
}
