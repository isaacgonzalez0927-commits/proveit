import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeUsername } from "@/lib/usernameAuth";
import { PREMIUM_TRIAL_DAYS } from "@/lib/premiumTrial";

function normalizePlan(plan: unknown): "free" | "pro" | "premium" {
  if (plan === "premium") return "premium";
  if (plan === "pro") return "pro";
  return "free";
}

type ProfileRow = Record<string, unknown>;

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
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) return data;
  return {
    ...data,
    plan: revert,
    premium_trial_ends_at: null,
    premium_trial_revert_plan: null,
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
    typeof plan === "string" && ["free", "pro", "premium"].includes(plan);
  let currentRow: ProfileRow | null = null;
  if (needsCurrentRow) {
    const { data } = await supabase
      .from("profiles")
      .select("plan, premium_trial_ends_at")
      .eq("id", user.id)
      .maybeSingle();
    currentRow = (data as ProfileRow) ?? null;
  }

  const prevPlan = normalizePlan(currentRow?.plan);

  if (typeof plan === "string" && ["free", "pro", "premium"].includes(plan)) {
    updates.plan = plan;
    if (plan === "free" || plan === "pro") {
      updates.premium_trial_ends_at = null;
      updates.premium_trial_revert_plan = null;
    }
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
        },
      });
    }
    const final = await expirePremiumTrialIfNeeded(supabase, user.id, row as ProfileRow);
    return NextResponse.json({ ok: true, profile: profileJsonFromRow(final) });
  }

  const { data: updatedRows, error: upError } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select("id");

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
      ...updates,
    });
    if (insError) {
      if (/profiles_username_unique|duplicate key|unique constraint/i.test(insError.message)) {
        return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
      }
      return NextResponse.json({ error: insError.message }, { status: 400 });
    }
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
        plan: normalizePlan(updates.plan),
        planBilling:
          typeof updates.plan_billing === "string" && ["monthly", "yearly"].includes(updates.plan_billing)
            ? (updates.plan_billing as "monthly" | "yearly")
            : "monthly",
        createdAt: user.created_at,
        username: typeof updates.username === "string" ? updates.username : undefined,
        contactEmail:
          updates.contact_email === null
            ? undefined
            : typeof updates.contact_email === "string"
              ? updates.contact_email
              : undefined,
        name: typeof updates.name === "string" ? updates.name : undefined,
        premiumTrialEndsAt:
          updates.premium_trial_ends_at != null ? String(updates.premium_trial_ends_at) : null,
        premiumTrialUsed: updates.premium_trial_used === true,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    profile: profileJsonFromRow(finalRow),
  });
}
