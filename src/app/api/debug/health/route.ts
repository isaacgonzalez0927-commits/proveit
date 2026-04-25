import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Diagnostic endpoint reporting whether the production server can talk to
 * Supabase (auth + each table the app writes to). No secrets in the response —
 * only presence flags + read counts so we can pinpoint persistence failures.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TableProbe = {
  table: string;
  ok: boolean;
  count: number | null;
  error: string | null;
};

export async function GET() {
  const env = {
    NEXT_PUBLIC_SUPABASE_URL_present: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY_present: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY_present: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    OPENAI_API_KEY_present: !!process.env.OPENAI_API_KEY,
    VERCEL_ENV: process.env.VERCEL_ENV ?? null,
    VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
  };

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({
      env,
      supabase: { configured: false },
      auth: null,
      tables: [],
    });
  }

  let authStatus: {
    signedIn: boolean;
    userId: string | null;
    email: string | null;
    error: string | null;
  };
  try {
    const { data, error } = await supabase.auth.getUser();
    authStatus = {
      signedIn: !!data.user,
      userId: data.user?.id ?? null,
      email: data.user?.email ?? null,
      error: error?.message ?? null,
    };
  } catch (e) {
    authStatus = {
      signedIn: false,
      userId: null,
      email: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  const tables: TableProbe[] = [];
  const tablesToProbe = ["profiles", "goals", "submissions"] as const;

  // The submissions table links to a user only via `goal_id` → goals.user_id, so
  // we look up the user's goal ids first and filter on those.
  let userGoalIds: string[] = [];
  if (authStatus.userId) {
    try {
      const { data } = await supabase
        .from("goals")
        .select("id")
        .eq("user_id", authStatus.userId);
      userGoalIds = (data ?? []).map((r) => (r as { id?: string }).id ?? "").filter(Boolean);
    } catch {
      /* ignore — diagnostic best-effort */
    }
  }

  for (const table of tablesToProbe) {
    try {
      let q = supabase.from(table).select("id", { count: "exact", head: true });
      if (authStatus.userId) {
        if (table === "profiles") {
          q = q.eq("id", authStatus.userId);
        } else if (table === "goals") {
          q = q.eq("user_id", authStatus.userId);
        } else if (table === "submissions") {
          if (userGoalIds.length > 0) {
            q = q.in("goal_id", userGoalIds);
          } else {
            // no goals → no submissions; report 0 without hitting a column-not-found path.
            tables.push({ table, ok: true, count: 0, error: null });
            continue;
          }
        }
      }
      const { count, error } = await q;
      tables.push({
        table,
        ok: !error,
        count: typeof count === "number" ? count : null,
        error: error
          ? JSON.stringify({
              message: error.message ?? null,
              code: (error as { code?: unknown }).code ?? null,
              details: (error as { details?: unknown }).details ?? null,
              hint: (error as { hint?: unknown }).hint ?? null,
            })
          : null,
      });
    } catch (e) {
      tables.push({
        table,
        ok: false,
        count: null,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  let submissionsSelectProbe: {
    ok: boolean;
    rowCount: number | null;
    columnsSeen: string[];
    error: string | null;
  } | null = null;
  if (userGoalIds.length > 0) {
    try {
      const { data, error } = await supabase
        .from("submissions")
        .select("*")
        .in("goal_id", userGoalIds)
        .limit(1);
      const firstRow = (data && data[0]) as Record<string, unknown> | undefined;
      submissionsSelectProbe = {
        ok: !error,
        rowCount: data?.length ?? 0,
        columnsSeen: firstRow ? Object.keys(firstRow) : [],
        error: error
          ? JSON.stringify({
              message: error.message ?? null,
              code: (error as { code?: unknown }).code ?? null,
              details: (error as { details?: unknown }).details ?? null,
              hint: (error as { hint?: unknown }).hint ?? null,
            })
          : null,
      };
    } catch (e) {
      submissionsSelectProbe = {
        ok: false,
        rowCount: null,
        columnsSeen: [],
        error: e instanceof Error ? e.message : String(e),
      };
    }
  } else {
    submissionsSelectProbe = {
      ok: true,
      rowCount: 0,
      columnsSeen: [],
      error: "no goals to query submissions against",
    };
  }

  // Server-local "today" (UTC). The client uses local-tz `yyyy-MM-dd`, but
  // for diagnostic purposes we just want to see the actual stored values.
  const todayUtc = new Date().toISOString().slice(0, 10);

  let recentSubmissions:
    | Array<{
        id: string;
        goal_id: string;
        date: string | null;
        status: string | null;
        verified_at: string | null;
        created_at: string | null;
        ai_feedback_present: boolean;
        matchesTodayUtc: boolean;
      }>
    | null = null;
  if (userGoalIds.length > 0) {
    try {
      const { data } = await supabase
        .from("submissions")
        .select("id, goal_id, date, status, verified_at, created_at, ai_feedback")
        .in("goal_id", userGoalIds)
        .order("created_at", { ascending: false })
        .limit(5);
      recentSubmissions = (data ?? []).map((row) => {
        const r = row as Record<string, unknown>;
        const rawDate = typeof r.date === "string" ? r.date : null;
        return {
          id: String(r.id ?? ""),
          goal_id: String(r.goal_id ?? ""),
          date: rawDate,
          status: typeof r.status === "string" ? r.status : null,
          verified_at: typeof r.verified_at === "string" ? r.verified_at : null,
          created_at: typeof r.created_at === "string" ? r.created_at : null,
          ai_feedback_present: typeof r.ai_feedback === "string" && r.ai_feedback.length > 0,
          matchesTodayUtc: rawDate === todayUtc,
        };
      });
    } catch {
      /* ignore */
    }
  }

  let goalsCompletedDates:
    | Array<{
        id: string;
        title: string | null;
        frequency: string | null;
        completed_dates: string[] | null;
        completed_dates_count: number;
      }>
    | null = null;
  if (authStatus.userId) {
    try {
      const { data } = await supabase
        .from("goals")
        .select("id, title, frequency, completed_dates")
        .eq("user_id", authStatus.userId)
        .order("created_at", { ascending: false })
        .limit(10);
      goalsCompletedDates = (data ?? []).map((row) => {
        const r = row as Record<string, unknown>;
        const cd = Array.isArray(r.completed_dates)
          ? (r.completed_dates as unknown[]).filter((v): v is string => typeof v === "string")
          : null;
        return {
          id: String(r.id ?? ""),
          title: typeof r.title === "string" ? r.title : null,
          frequency: typeof r.frequency === "string" ? r.frequency : null,
          completed_dates: cd,
          completed_dates_count: cd?.length ?? 0,
        };
      });
    } catch {
      /* ignore */
    }
  }

  return NextResponse.json({
    env,
    supabase: { configured: true },
    auth: authStatus,
    serverTodayUtc: todayUtc,
    tables,
    submissionsSelectProbe,
    recentSubmissions,
    goalsCompletedDates,
  });
}
