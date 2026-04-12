import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  isProofRequirementAllowed,
  parseProofSuggestionsPayload,
} from "@/lib/proofSuggestions";

function normalizeCompletedDates(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string");
  }
  return [];
}

function normalizeReminderDays(value: unknown): number[] | undefined {
  if (Array.isArray(value)) {
    const nums = value.filter((v): v is number => typeof v === "number" && v >= 0 && v <= 6);
    return nums.length > 0 ? nums.sort((a, b) => a - b) : undefined;
  }
  return undefined;
}

/** Store and return HH:mm for clients (handles TEXT, TIME with seconds, etc.). */
function normalizeReminderTime(value: unknown): string | undefined {
  if (value == null || value === "") return undefined;
  const s = String(value).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return undefined;
  const h = Math.min(23, Math.max(0, Number.parseInt(m[1]!, 10)));
  const min = Math.min(59, Math.max(0, Number.parseInt(m[2]!, 10)));
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

const GOALS_SCHEMA_CATCHUP =
  "Your Supabase `goals` table is missing columns the app expects. Fix: Supabase Dashboard → SQL → New query → paste and run the file `supabase/migrations/011_goals_schema_catchup.sql` from this project, then try again.";

function isGoalsSchemaColumnError(message: string): boolean {
  const m = message.toLowerCase();
  const soundsLikeMissing =
    m.includes("does not exist") || m.includes("could not find") || m.includes("not find");
  if (!soundsLikeMissing) return false;
  return /proof_suggestions|proof_require|times_per_week|reminder_day|reminder_days|grace_period|is_on_break|break_|streak_carryover/i.test(
    m
  );
}

function normalizeProofSuggestionsFromRow(value: unknown): string[] | undefined {
  if (value == null) return undefined;
  if (Array.isArray(value)) {
    const s = value
      .filter((x): x is string => typeof x === "string")
      .map((x) => x.trim())
      .filter(Boolean);
    return s.length > 0 ? s : undefined;
  }
  return undefined;
}

function mapGoalRow(row: Record<string, unknown>) {
  const reminderDay = row.reminder_day != null ? (row.reminder_day as number) : undefined;
  const reminderDays = normalizeReminderDays(row.reminder_days) ?? (typeof reminderDay === "number" ? [reminderDay] : undefined);
  const frequencyRaw = (row.frequency as string) ?? "daily";
  const frequency = frequencyRaw === "weekly" ? "weekly" : "daily";
  const rawTimes = row.times_per_week;
  const timesPerWeek =
    typeof rawTimes === "number" && rawTimes >= 1 && rawTimes <= 7
      ? (rawTimes as 1 | 2 | 3 | 4 | 5 | 6 | 7)
      : frequency === "daily"
        ? 7
        : 1;
  return {
    id: row.id as string,
    userId: row.user_id as string,
    title: row.title as string,
    description: (row.description as string | null) ?? undefined,
    frequency: frequency as "daily" | "weekly",
    timesPerWeek,
    reminderTime: normalizeReminderTime(row.reminder_time),
    reminderDay,
    reminderDays: frequency === "daily" ? undefined : reminderDays,
    gracePeriod: (row.grace_period as string | null) ?? undefined,
    isOnBreak: row.is_on_break === true,
    breakStartedAt: (row.break_started_at as string | null) ?? undefined,
    breakStreakSnapshot: (row.break_streak_snapshot as number | null) ?? undefined,
    streakCarryover: (row.streak_carryover as number | null) ?? undefined,
    createdAt: row.created_at as string,
    completedDates: normalizeCompletedDates(row.completed_dates),
    proofSuggestions: normalizeProofSuggestionsFromRow(row.proof_suggestions),
    proofRequirement:
      typeof row.proof_requirement === "string" && row.proof_requirement.trim()
        ? row.proof_requirement.trim()
        : undefined,
  };
}

export async function GET() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ goals: [] });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const goals = (data ?? []).map((row) => mapGoalRow(row as Record<string, unknown>));

  return NextResponse.json({ goals });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    id,
    title,
    description,
    frequency,
    timesPerWeek,
    reminderTime,
    reminderDay,
    reminderDays,
    gracePeriod,
    proofSuggestions: proofSuggestionsBody,
    proofRequirement: proofRequirementBody,
  } = body;

  const proofSuggestionsParsed = parseProofSuggestionsPayload(proofSuggestionsBody);
  const proofRequirementParsed =
    typeof proofRequirementBody === "string" ? proofRequirementBody.trim() : "";
  if (
    !proofSuggestionsParsed ||
    !isProofRequirementAllowed(proofRequirementParsed, proofSuggestionsParsed)
  ) {
    return NextResponse.json(
      {
        error:
          "Choose one of the AI-generated photo prompts for this goal (tap Get AI photo ideas, then pick an option).",
      },
      { status: 400 }
    );
  }

  // Ensure profile row exists (e.g. if trigger missed it). Do not overwrite plan.
  try {
    await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email ?? "",
      },
      { onConflict: "id" }
    );
  } catch {
    // ignore
  }

  const frequencyNorm: "daily" | "weekly" =
    frequency === "weekly"
      ? "weekly"
      : frequency === "daily" ||
          (Array.isArray(reminderDays) && reminderDays.length === 7) ||
          timesPerWeek === 7
        ? "daily"
        : Array.isArray(reminderDays) && reminderDays.length > 0
          ? "weekly"
          : "daily";

  const isDaily = frequencyNorm === "daily";
  const reminderDayVal = reminderDay ?? (Array.isArray(reminderDays) && reminderDays.length > 0 ? reminderDays[0] : null);
  const reminderDaysVal = Array.isArray(reminderDays) && reminderDays.length > 0 ? reminderDays : null;

  const resolvedTimesPerWeek =
    typeof timesPerWeek === "number" && timesPerWeek >= 1 && timesPerWeek <= 7
      ? timesPerWeek
      : isDaily
        ? 7
        : Array.isArray(reminderDays) && reminderDays.length > 0
          ? Math.min(7, reminderDays.length)
          : 1;

  const reminderTimeNorm = normalizeReminderTime(reminderTime) ?? null;

  // Minimal columns that exist in the base goals table (no reminder_day, reminder_days, grace_period).
  const minimalInsert: Record<string, unknown> = {
    id,
    user_id: user.id,
    title,
    description: description ?? null,
    frequency: frequencyNorm,
    reminder_time: reminderTimeNorm,
    times_per_week: resolvedTimesPerWeek,
    proof_suggestions: proofSuggestionsParsed,
    proof_requirement: proofRequirementParsed,
  };

  // Daily: only use minimal columns so we never touch reminder_day/reminder_days (avoids "could not find reminder day" on strict or older DBs).
  // Weekly: add reminder columns if present in schema.
  const weeklyInsert: Record<string, unknown> = { ...minimalInsert, reminder_day: reminderDayVal, reminder_days: reminderDaysVal };
  const fullInsert: Record<string, unknown> = { ...minimalInsert, grace_period: gracePeriod ?? "eod" };
  if (!isDaily) {
    fullInsert.reminder_day = reminderDayVal;
    fullInsert.reminder_days = reminderDaysVal;
  }

  const insertGoal = async (payload: Record<string, unknown>) => {
    return supabase.from("goals").insert(payload).select().single();
  };

  let data: Record<string, unknown> | null = null;
  let error: { message: string } | null = null;

  const proofMigrationMessage = GOALS_SCHEMA_CATCHUP;

  if (isDaily) {
    // Daily: try minimal first (no grace_period, no reminder columns)
    let result = await insertGoal(minimalInsert);
    if (result.error) {
      const msg = result.error.message ?? "";
      if (/proof_suggestions|proof_requirement/i.test(msg)) {
        return NextResponse.json({ error: proofMigrationMessage }, { status: 503 });
      } else if (/times.?per.?week/i.test(msg)) {
        const { times_per_week: _tw, ...withoutTimes } = minimalInsert;
        result = await insertGoal(withoutTimes);
      } else if (/grace_period|grace period|reminder|does not exist/i.test(msg)) {
        result = await insertGoal({ ...minimalInsert, grace_period: gracePeriod ?? "eod" });
      }
      if (result.error) {
        error = result.error;
        data = null;
      } else {
        data = result.data as Record<string, unknown>;
      }
    } else {
      data = result.data as Record<string, unknown>;
    }
  } else {
    // Weekly: try full (with grace_period and reminder columns), then strip grace_period if DB doesn't have it
    let result = await insertGoal(fullInsert);
    if (result.error) {
      const msg = result.error.message ?? "";
      if (/proof_suggestions|proof_requirement/i.test(msg)) {
        return NextResponse.json({ error: proofMigrationMessage }, { status: 503 });
      } else if (/times.?per.?week/i.test(msg)) {
        const { times_per_week: _tw, ...withoutTimes } = fullInsert;
        result = await insertGoal(withoutTimes);
      } else if (/grace_period|grace period|does not exist/i.test(msg)) {
        result = await insertGoal(weeklyInsert);
      }
      if (result.error) {
        const retryMsg = result.error.message ?? "";
        if (/times.?per.?week/i.test(retryMsg)) {
          const { times_per_week: _tw, ...withoutTimesWeekly } = weeklyInsert;
          result = await insertGoal(withoutTimesWeekly);
        } else if (/reminder_day|reminder_days|does not exist/i.test(retryMsg)) {
          result = await insertGoal(minimalInsert);
        }
        if (result.error) {
          error = result.error;
        } else {
          data = result.data as Record<string, unknown>;
        }
      } else {
        data = result.data as Record<string, unknown>;
      }
    } else {
      data = result.data as Record<string, unknown>;
    }
  }

  if (error) {
    const msg = error.message ?? "";
    if (isGoalsSchemaColumnError(msg)) {
      return NextResponse.json({ error: GOALS_SCHEMA_CATCHUP }, { status: 503 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Insert failed" }, { status: 500 });

  const mapped = mapGoalRow(data);
  return NextResponse.json({ goal: mapped });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const dbUpdates: Record<string, unknown> = {};
  if ("title" in updates) dbUpdates.title = updates.title;
  if ("description" in updates) dbUpdates.description = updates.description ?? null;
  if ("frequency" in updates) {
    dbUpdates.frequency = updates.frequency === "weekly" ? "weekly" : "daily";
  }
  if ("reminderTime" in updates) {
    dbUpdates.reminder_time = normalizeReminderTime(updates.reminderTime) ?? null;
  }
  if ("reminderDay" in updates) dbUpdates.reminder_day = updates.reminderDay ?? null;
  if ("reminderDays" in updates) {
    const rd = updates.reminderDays;
    dbUpdates.reminder_days = Array.isArray(rd) && rd.length > 0 ? rd : null;
  }
  if ("gracePeriod" in updates) dbUpdates.grace_period = updates.gracePeriod ?? null;
  if ("timesPerWeek" in updates) {
    const tw = updates.timesPerWeek;
    if (typeof tw === "number" && tw >= 1 && tw <= 7) dbUpdates.times_per_week = tw;
  }
  if ("completedDates" in updates) dbUpdates.completed_dates = updates.completedDates ?? [];
  if ("isOnBreak" in updates) dbUpdates.is_on_break = updates.isOnBreak === true;
  if ("breakStartedAt" in updates) dbUpdates.break_started_at = updates.breakStartedAt ?? null;
  if ("breakStreakSnapshot" in updates) {
    dbUpdates.break_streak_snapshot = updates.breakStreakSnapshot ?? null;
  }
  if ("streakCarryover" in updates) dbUpdates.streak_carryover = updates.streakCarryover ?? null;

  if ("proofRequirement" in updates || "proofSuggestions" in updates) {
    if (!("proofRequirement" in updates && "proofSuggestions" in updates)) {
      return NextResponse.json(
        { error: "Send proofSuggestions and proofRequirement together when updating proof prompts." },
        { status: 400 }
      );
    }
    const suggList = parseProofSuggestionsPayload(updates.proofSuggestions);
    const reqStr = typeof updates.proofRequirement === "string" ? updates.proofRequirement.trim() : "";
    if (!suggList || !isProofRequirementAllowed(reqStr, suggList)) {
      return NextResponse.json({ error: "Pick one of the suggested photo prompts." }, { status: 400 });
    }
    dbUpdates.proof_suggestions = suggList;
    dbUpdates.proof_requirement = reqStr;
  }

  if (Object.keys(dbUpdates).length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase
    .from("goals")
    .update(dbUpdates)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    const msg = error.message ?? "";
    if (isGoalsSchemaColumnError(msg)) {
      return NextResponse.json({ error: GOALS_SCHEMA_CATCHUP }, { status: 503 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await supabase
    .from("goals")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
