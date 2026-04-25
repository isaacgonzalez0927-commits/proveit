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

  for (const table of tablesToProbe) {
    try {
      let q = supabase.from(table).select("id", { count: "exact", head: true });
      if (authStatus.userId) {
        if (table === "profiles") {
          q = q.eq("id", authStatus.userId);
        } else {
          q = q.eq("user_id", authStatus.userId);
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
  if (authStatus.userId) {
    try {
      const { data, error } = await supabase
        .from("submissions")
        .select("*")
        .eq("user_id", authStatus.userId)
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
  }

  return NextResponse.json({
    env,
    supabase: { configured: true },
    auth: authStatus,
    tables,
    submissionsSelectProbe,
  });
}
