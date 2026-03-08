import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const EMAIL_FORMAT = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/;

/**
 * Sends password reset email via Resend (same styled template as confirmation).
 * No auth required — call with { email, origin }.
 */
export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
    return NextResponse.json(
      { error: "Password reset email is not configured." },
      { status: 501 }
    );
  }

  let email: string;
  let origin: string;
  try {
    const body = await request.json().catch(() => ({}));
    email = typeof body.email === "string" ? body.email.trim() : "";
    const rawOrigin = body.origin ?? request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
    origin = rawOrigin ? (rawOrigin.startsWith("http") ? rawOrigin : `https://${rawOrigin}`) : "";
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!email || !EMAIL_FORMAT.test(email)) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }

  const redirectTo = origin ? `${origin}/api/auth/callback?next=/reset-password` : "";
  const admin = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: redirectTo ? { redirectTo } : undefined,
  });

  if (linkError) {
    return NextResponse.json({ message: "Check your email for the reset link." }, { status: 200 });
  }

  const props = linkData && typeof linkData === "object" && "properties" in linkData ? (linkData as { properties?: { action_link?: string } }).properties : undefined;
  let actionLink =
    props?.action_link ?? (linkData as { action_link?: string } | null)?.action_link;

  if (!actionLink || typeof actionLink !== "string") {
    return NextResponse.json({ message: "Check your email for the reset link." }, { status: 200 });
  }

  if (actionLink.startsWith("/")) {
    actionLink = `${supabaseUrl.replace(/\/$/, "")}${actionLink}`;
  }

  const from = process.env.RESEND_FROM_EMAIL ?? "Proveit <onboarding@resend.dev>";
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
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Reset your password</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#475569;">Click the button below to set a new password for your Proveit account.</p>
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:10px;background:#16a34a;"><a href="${escapedLink}" target="_blank" rel="noopener" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Set new password</a></td></tr></table>
          <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;">If you didn't request this, you can ignore this email.</p>
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
      to: [email],
      subject: "Reset your Proveit password",
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

  return NextResponse.json({ message: "Check your email for the reset link." });
}
