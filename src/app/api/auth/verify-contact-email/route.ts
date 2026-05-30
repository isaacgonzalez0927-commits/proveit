import { NextRequest, NextResponse } from "next/server";
import { isContactEmailTaken } from "@/lib/accountEmailUniqueness";
import { createServiceRoleClient } from "@/lib/supabaseAdmin";

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

  const admin = createServiceRoleClient();
  if (!admin) {
    return redirectToSettings(request, "contactVerify=unconfigured");
  }

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
    if (/profiles_contact_email|contact_email_pending|duplicate key|unique constraint/i.test(upErr.message)) {
      return redirectToSettings(request, "contactVerify=taken");
    }
    return redirectToSettings(request, "contactVerify=error");
  }

  return redirectToSettings(request, "contactVerified=1");
}
