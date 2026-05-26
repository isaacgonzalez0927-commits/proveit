import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeUsername } from "@/lib/usernameAuth";
import { PREMIUM_TRIAL_DAYS } from "@/lib/premiumTrial";
import {
  TRIAL_STREAK_SHIELD_BALANCE,
  getActiveReminderLimit,
  getGraceDayResetBalance,
} from "@/lib/subscriptionLimits";

function normalizePlan(plan: unknown): "free" | "pro" | "premium" {
  if (plan === "premium") return "premium";
  if (plan === "pro") return "pro";
  return "free";
}

type ProfileRow = Record<string, unknown>;

function isOptionalProfileSchemaError(message: string): boolean {
  const lower = message.toLowerCase();
  const soundsMissing =
    lower.includes("does not exist") ||
    lower.includes("could not find") ||
    lower.includes("not find") ||
    lower.includes("schema cache");
  if (!soundsMissing) return false;
  return /grace_day_|strict_ai_verification|trial_expired_needs_review|ai_verification_|premium_trial_/i.test(
    message
  );
}

function buildProfileFallbackUpdates(updates: Record<string, unknown>): Record<string, unknown> {
  const fallback: Record<string, unknown> = { updated_at: updates.updated_at };
  for (const key of ["plan", "plan_billing", "username", "contact_email", "name"]) {
    if (updates[key] !== undefined) fallback[key] = updates[key];
  }
  return fallback;
}

async function freezeExcessRemindersForPlan(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  userId: string,
  plan: "free" | "pro" | "premium"
) {
  const limit = getActiveReminderLimit(plan);
  const { data } = await supabase
    .from("goals")
    .select("id, reminder_time, reminder_is_active, created_at, archived_at")
    .eq("user_id", userId)
    .is("archived_at", null)
    .order("created_at", { ascending: true });
  const rows = data ?? [];
  let activeSeen = 0;
  const idsToFreeze: string[] = [];
  for (const row of rows as Array<Record<string, unknown>>) {
    if (!row.reminder_time) continue;
    if (row.reminder_is_active === false) continue;
    activeSeen += 1;
    if (activeSeen > limit && typeof row.id === "string") idsToFreeze.push(row.id);
  }
  if (idsToFreeze.length > 0) {
    await supabase.from("goals").update({ reminder_is_active: false }).in("id", idsToFreeze);
  }
}

function premiumTrialEndsAtISO(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + PREMIUM_TRIAL_DAYS);
  return d.toISOString();
}

/** If Premium trial ended, persist revert and return the updated row shape. */
async function expirePremiumTrialIfNeeded(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  userId: string,
  data: ProfileRow
): Promise<ProfileRow> {
  if (data.plan !== "premium" || data.premium_trial_ends_at == null) return data;
  const ends = new Date(String(data.premium_trial_ends_at)).getTime();
  if (Number.isNaN(ends) || Date.now() <= ends) return data;
  const revert = data.premium_trial_revert_plan === "pro" ? "pro" : "free";
  const { error } = await supabase
    .from("profiles")
    .update({
      plan: revert,
      premium_trial_ends_at: null,
      premium_trial_revert_plan: null,
      grace_day_balance: getGraceDayResetBalance(revert),
      grace_day_cycle_anchor: new Date().toISOString(),
      strict_ai_verification: false,
      trial_expired_needs_review: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) return data;
  await freezeExcessRemindersForPlan(supabase, userId, revert);
  return {
    ...data,
    plan: revert,
    premium_trial_ends_at: null,
    premium_trial_revert_plan: null,
    grace_day_balance: getGraceDayResetBalance(revert),
    grace_day_cycle_anchor: new Date().toISOString(),
    strict_ai_verification: false,
    trial_expired_needs_review: true,
  };
}

function profileJsonFromRow(data: ProfileRow) {
  return {
    id: data.id as string,
    email: data.email as string,
    plan: normalizePlan(data.plan),
    planBilling: (data.plan_billing as string) ?? "monthly",
    createdAt: data.created_at as string,
    username: typeof data.username === "string" ? data.username : undefined,
    contactEmail: typeof data.contact_email === "string" ? data.contact_email : undefined,
    name: typeof data.name === "string" ? data.name : undefined,
    premiumTrialEndsAt:
      data.premium_trial_ends_at != null ? String(data.premium_trial_ends_at) : null,
    premiumTrialUsed: data.premium_trial_used === true,
    graceDayBalance:
      typeof data.grace_day_balance === "number" ? data.grace_day_balance : 0,
    graceDayCycleAnchor:
      data.grace_day_cycle_anchor != null ? String(data.grace_day_cycle_anchor) : null,
    strictAiVerification: data.strict_ai_verification === true,
    trialExpiredNeedsReview: data.trial_expired_needs_review === true,
    aiVerificationCycleKey:
      data.ai_verification_cycle_key != null ? String(data.ai_verification_cycle_key) : null,
    aiVerificationCount:
      typeof data.ai_verification_count === "number" ? data.ai_verification_count : 0,
  };
}

const EMAIL_FORMAT = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/;

export async function GET() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ profile: null });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ profile: null });

  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  if (error || !data) {
    return NextResponse.json({
      profile: {
        id: user.id,
        email: user.email ?? "",
        plan: "free" as const,
        planBilling: "monthly",
        createdAt: user.created_at,
        username: undefined as string | undefined,
        contactEmail: undefined as string | undefined,
        name: undefined as string | undefined,
        premiumTrialEndsAt: null,
        premiumTrialUsed: false,
        graceDayBalance: 0,
        graceDayCycleAnchor: null,
        strictAiVerification: false,
        trialExpiredNeedsReview: false,
        aiVerificationCycleKey: null,
        aiVerificationCount: 0,
      },
    });
  }

  const row = await expirePremiumTrialIfNeeded(supabase, user.id, data as ProfileRow);
  return NextResponse.json({ profile: profileJsonFromRow(row) });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.startPremiumTrial === true) {
    const { data: row, error: fetchErr } = await supabase
      .from("profiles")
      .select("plan, premium_trial_used, premium_trial_ends_at, premium_trial_revert_plan")
      .eq("id", user.id)
      .maybeSingle();

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 400 });
    }

    const used = row?.premium_trial_used === true;
    if (used) {
      return NextResponse.json(
        { error: "You already used your Premium free trial." },
        { status: 400 }
      );
    }

    const currentPlan = normalizePlan(row?.plan);
    if (currentPlan === "premium") {
      return NextResponse.json({ error: "Already on Premium." }, { status: 400 });
    }

    const revert: "free" | "pro" = currentPlan === "pro" ? "pro" : "free";
    const billing =
      typeof body.planBilling === "string" && ["monthly", "yearly"].includes(body.planBilling)
        ? body.planBilling
        : "monthly";

    const trialUpdates: Record<string, unknown> = {
      plan: "premium",
      plan_billing: billing,
      premium_trial_ends_at: premiumTrialEndsAtISO(),
      premium_trial_used: true,
      premium_trial_revert_plan: revert,
      grace_day_balance: TRIAL_STREAK_SHIELD_BALANCE,
      grace_day_cycle_anchor: new Date().toISOString(),
      strict_ai_verification: false,
      trial_expired_needs_review: false,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedRows, error: upError } = await supabase
      .from("profiles")
      .update(trialUpdates)
      .eq("id", user.id)
      .select("id");

    if (upError) {
      return NextResponse.json({ error: upError.message }, { status: 400 });
    }

    if (!updatedRows?.length) {
      const { error: insError } = await supabase.from("profiles").insert({
        id: user.id,
        email: user.email ?? "",
        ...trialUpdates,
      });
      if (insError) {
        return NextResponse.json({ error: insError.message }, { status: 400 });
      }
    }

    const { data: fresh } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    const finalRow = fresh
      ? await expirePremiumTrialIfNeeded(supabase, user.id, fresh as ProfileRow)
      : ({ ...row, ...trialUpdates, id: user.id } as ProfileRow);

    return NextResponse.json({
      ok: true,
      profile: profileJsonFromRow(finalRow),
    });
  }

  const plan = body.plan;
  const planBilling = body.planBilling;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  const needsCurrentRow =
    typeof plan === "string" && ["free", "pro", "premium"].includes(plan) ||
    body.strictAiVerification !== undefined;
  let currentRow: ProfileRow | null = null;
  if (needsCurrentRow) {
    const { data } = await supabase
      .from("profiles")
      .select("plan, premium_trial_ends_at, strict_ai_verification")
      .eq("id", user.id)
      .maybeSingle();
    currentRow = (data as ProfileRow) ?? null;
  }

  const prevPlan = normalizePlan(currentRow?.plan);

  if (typeof plan === "string" && ["free", "pro", "premium"].includes(plan)) {
    updates.plan = plan;
    updates.grace_day_balance = getGraceDayResetBalance(plan as "free" | "pro" | "premium");
    updates.grace_day_cycle_anchor = new Date().toISOString();
    updates.trial_expired_needs_review = false;
    if (plan === "free" || plan === "pro") {
      updates.premium_trial_ends_at = null;
      updates.premium_trial_revert_plan = null;
    }
    if (plan === "free") updates.strict_ai_verification = false;
    if (plan === "premium" && prevPlan !== "premium") {
      updates.premium_trial_ends_at = null;
      updates.premium_trial_revert_plan = null;
    }
  }
  if (typeof planBilling === "string" && ["monthly", "yearly"].includes(planBilling)) {
    updates.plan_billing = planBilling;
  }

  if (body.username !== undefined && body.username !== null) {
    if (typeof body.username !== "string") {
      return NextResponse.json({ error: "Invalid username." }, { status: 400 });
    }
    const { data: existing } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    if (existing?.username && String(existing.username).trim() !== "") {
      return NextResponse.json({ error: "Username is already set." }, { status: 400 });
    }
    const u = normalizeUsername(body.username);
    if (!u) {
      return NextResponse.json(
        { error: "Username must be 3–20 characters: letters, numbers, or underscore." },
        { status: 400 }
      );
    }
    updates.username = u;
  }

  if (body.contact_email !== undefined) {
    if (body.contact_email === null || body.contact_email === "") {
      updates.contact_email = null;
    } else if (typeof body.contact_email === "string") {
      const c = body.contact_email.trim().toLowerCase();
      if (!EMAIL_FORMAT.test(c)) {
        return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
      }
      updates.contact_email = c;
    } else {
      return NextResponse.json({ error: "Invalid contact email." }, { status: 400 });
    }
  }

  if (body.name !== undefined) {
    if (typeof body.name !== "string") {
      return NextResponse.json({ error: "Invalid name." }, { status: 400 });
    }
    const n = body.name.trim().slice(0, 80);
    updates.name = n || null;
  }
  if (body.strictAiVerification !== undefined) {
    const wantsStrict = body.strictAiVerification === true;
    const effectivePlan = normalizePlan(updates.plan ?? currentRow?.plan);
    updates.strict_ai_verification =
      wantsStrict && (effectivePlan === "pro" || effectivePlan === "premium");
  }

  const meaningfulKeys = Object.keys(updates).filter((k) => k !== "updated_at");
  if (meaningfulKeys.length === 0) {
    const { data: row } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (!row) {
      return NextResponse.json({
        ok: true,
        profile: {
          id: user.id,
          email: user.email ?? "",
          plan: "free" as const,
          planBilling: "monthly",
          createdAt: user.created_at,
          username: undefined as string | undefined,
          contactEmail: undefined as string | undefined,
          name: undefined as string | undefined,
          premiumTrialEndsAt: null,
          premiumTrialUsed: false,
          graceDayBalance: 0,
          graceDayCycleAnchor: null,
          strictAiVerification: false,
          trialExpiredNeedsReview: false,
          aiVerificationCycleKey: null,
          aiVerificationCount: 0,
        },
      });
    }
    const final = await expirePremiumTrialIfNeeded(supabase, user.id, row as ProfileRow);
    return NextResponse.json({ ok: true, profile: profileJsonFromRow(final) });
  }

  let appliedUpdates = updates;
  let { data: updatedRows, error: upError } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select("id");

  if (upError) {
    const fallbackUpdates = buildProfileFallbackUpdates(updates);
    const canRetryWithCoreProfileColumns =
      isOptionalProfileSchemaError(upError.message) &&
      Object.keys(fallbackUpdates).some((key) => key !== "updated_at");
    if (canRetryWithCoreProfileColumns) {
      const retry = await supabase
        .from("profiles")
        .update(fallbackUpdates)
        .eq("id", user.id)
        .select("id");
      updatedRows = retry.data;
      upError = retry.error;
      if (!upError) {
        appliedUpdates = fallbackUpdates;
      }
    }
  }

  if (upError) {
    if (/profiles_username_unique|duplicate key|unique constraint/i.test(upError.message)) {
      return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
    }
    return NextResponse.json({ error: upError.message }, { status: 400 });
  }

  if (!updatedRows?.length) {
    const { error: insError } = await supabase.from("profiles").insert({
      id: user.id,
      email: user.email ?? "",
      ...appliedUpdates,
    });
    if (insError) {
      if (/profiles_username_unique|duplicate key|unique constraint/i.test(insError.message)) {
        return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
      }
      return NextResponse.json({ error: insError.message }, { status: 400 });
    }
  }

  if (typeof appliedUpdates.plan === "string") {
    await freezeExcessRemindersForPlan(
      supabase,
      user.id,
      normalizePlan(appliedUpdates.plan)
    );
  }

  const { data: fresh } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  let finalRow: ProfileRow | null = fresh
    ? await expirePremiumTrialIfNeeded(supabase, user.id, fresh as ProfileRow)
    : null;

  if (!finalRow) {
    const { data: again } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (again) {
      finalRow = await expirePremiumTrialIfNeeded(supabase, user.id, again as ProfileRow);
    }
  }

  if (!finalRow) {
    return NextResponse.json({
      ok: true,
      profile: {
        id: user.id,
        email: user.email ?? "",
        plan: normalizePlan(appliedUpdates.plan),
        planBilling:
          typeof appliedUpdates.plan_billing === "string" && ["monthly", "yearly"].includes(appliedUpdates.plan_billing)
            ? (appliedUpdates.plan_billing as "monthly" | "yearly")
            : "monthly",
        createdAt: user.created_at,
        username: typeof appliedUpdates.username === "string" ? appliedUpdates.username : undefined,
        contactEmail:
          appliedUpdates.contact_email === null
            ? undefined
            : typeof appliedUpdates.contact_email === "string"
              ? appliedUpdates.contact_email
              : undefined,
        name: typeof appliedUpdates.name === "string" ? appliedUpdates.name : undefined,
        premiumTrialEndsAt:
          appliedUpdates.premium_trial_ends_at != null ? String(appliedUpdates.premium_trial_ends_at) : null,
        premiumTrialUsed: appliedUpdates.premium_trial_used === true,
        graceDayBalance:
          typeof appliedUpdates.grace_day_balance === "number" ? appliedUpdates.grace_day_balance : 0,
        graceDayCycleAnchor:
          appliedUpdates.grace_day_cycle_anchor != null ? String(appliedUpdates.grace_day_cycle_anchor) : null,
        strictAiVerification: appliedUpdates.strict_ai_verification === true,
        trialExpiredNeedsReview: appliedUpdates.trial_expired_needs_review === true,
        aiVerificationCycleKey:
          appliedUpdates.ai_verification_cycle_key != null ? String(appliedUpdates.ai_verification_cycle_key) : null,
        aiVerificationCount:
          typeof appliedUpdates.ai_verification_count === "number" ? appliedUpdates.ai_verification_count : 0,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    profile: profileJsonFromRow(finalRow),
  });
}
