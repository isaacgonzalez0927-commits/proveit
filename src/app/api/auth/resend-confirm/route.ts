import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getResendFromOrProductionError } from "@/lib/resendFrom";

/**
 * Sends confirmation email via Resend (same path as password reset).
 * Uses Supabase admin to generate a magic link, then sends it with Resend API.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
    return NextResponse.json(
      {
        error:
          "Resend confirmation is not configured. Add SUPABASE_SERVICE_ROLE_KEY and RESEND_API_KEY.",
      },
      { status: 501 }
    );
  }

  let emailRedirectTo: string;
  try {
    const body = await request.json().catch(() => ({}));
    const origin = body.origin ?? request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
    const base = origin ? (origin.startsWith("http") ? origin : `https://${origin}`) : "";
    emailRedirectTo = base ? `${base}/api/auth/callback?next=/dashboard` : "";
  } catch {
    emailRedirectTo = "";
  }

  const admin = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: user.email,
    options: emailRedirectTo ? { redirectTo: emailRedirectTo } : undefined,
  });

  if (linkError) {
    return NextResponse.json(
      { message: "Check your inbox and spam folder." },
      { status: 200 }
    );
  }

  const props = linkData && typeof linkData === "object" && "properties" in linkData ? (linkData as { properties?: { action_link?: string } }).properties : undefined;
  let actionLink =
    props?.action_link ??
    (linkData as { action_link?: string } | null)?.action_link;

  if (!actionLink || typeof actionLink !== "string") {
    const keys = linkData && typeof linkData === "object" ? Object.keys(linkData) : [];
    return NextResponse.json(
      { error: `Could not get confirmation link. Keys: ${keys.join(", ") || "none"}.` },
      { status: 500 }
    );
  }

  if (actionLink.startsWith("/")) {
    actionLink = `${supabaseUrl.replace(/\/$/, "")}${actionLink}`;
  }

  const fromResult = getResendFromOrProductionError();
  if (!fromResult.ok) {
    return NextResponse.json({ error: fromResult.error }, { status: fromResult.status });
  }
  const from = fromResult.from;
  const escapedLink = actionLink.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f1f5f9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border-radius:16px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);overflow:hidden;">
        <tr><td style="padding:32px 24px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Confirm your email</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#475569;">Click the button below to confirm your email for Proveit. You’ll be signed in and taken to your dashboard.</p>
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:10px;background:#16a34a;"><a href="${escapedLink}" target="_blank" rel="noopener" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Confirm email</a></td></tr></table>
          <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;">If you didn’t request this, you can ignore this email.</p>
        </td></tr>
        <tr><td style="padding:16px 24px;background:#f8fafc;font-size:12px;color:#64748b;">Proveit – Set goals. Take a photo. Prove it.</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "Proveit/1.0",
    },
    body: JSON.stringify({
      from,
      to: [user.email],
      subject: "Confirm your Proveit email",
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.message ?? err?.error ?? (typeof err === "string" ? err : null);
    return NextResponse.json(
      { error: msg ? `Resend: ${msg}` : `Resend failed (${res.status}).` },
      { status: 502 }
    );
  }

  return NextResponse.json({
    message: "Confirmation email sent. Check your inbox and spam folder.",
  });
}
