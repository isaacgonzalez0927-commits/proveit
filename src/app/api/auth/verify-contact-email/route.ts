import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function redirectToSettings(request: NextRequest, query: string) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const url = new URL(request.url);
  const origin =
    forwardedHost && forwardedProto
      ? `${forwardedProto === "https" ? "https" : "http"}://${forwardedHost}`
      : url.origin;
  return NextResponse.redirect(`${origin}/settings?${query}`);
}

export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get("token")?.trim();
  if (!token) {
    return redirectToSettings(request, "contactVerify=missing");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return redirectToSettings(request, "contactVerify=unconfigured");
  }

  const admin = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: row, error: fetchErr } = await admin
    .from("profiles")
    .select("id, contact_email_pending, contact_email_verify_expires_at")
    .eq("contact_email_verify_token", token)
    .maybeSingle();

  if (fetchErr || !row?.id) {
    return redirectToSettings(request, "contactVerify=invalid");
  }

  const pending =
    typeof row.contact_email_pending === "string" ? row.contact_email_pending.trim().toLowerCase() : "";
  if (!pending) {
    return redirectToSettings(request, "contactVerify=invalid");
  }

  const expiresRaw = row.contact_email_verify_expires_at;
  if (expiresRaw != null) {
    const expires = Date.parse(String(expiresRaw));
    if (Number.isNaN(expires) || Date.now() > expires) {
      return redirectToSettings(request, "contactVerify=expired");
    }
  }

  const { error: upErr } = await admin
    .from("profiles")
    .update({
      contact_email: pending,
      contact_email_verified_at: new Date().toISOString(),
      contact_email_pending: null,
      contact_email_verify_token: null,
      contact_email_verify_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  if (upErr) {
    return redirectToSettings(request, "contactVerify=error");
  }

  return redirectToSettings(request, "contactVerified=1");
}
