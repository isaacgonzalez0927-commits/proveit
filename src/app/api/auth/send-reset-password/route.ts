import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getResendFromOrProductionError } from "@/lib/resendFrom";
import { isInternalAuthEmail, normalizeUsername } from "@/lib/usernameAuth";

const EMAIL_FORMAT = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/;

/**
 * Sends password reset email via Resend (same styled template as confirmation).
 * No auth required — call with { email, origin } or { username, origin }.
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

  let email = "";
  let origin = "";
  let username: string | null = null;
  try {
    const body = await request.json().catch(() => ({}));
    const rawOrigin = body.origin ?? request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
    origin = rawOrigin ? (rawOrigin.startsWith("http") ? rawOrigin : `https://${rawOrigin}`) : "";
    if (typeof body.username === "string" && body.username.trim()) {
      username = normalizeUsername(body.username);
      if (!username) {
        return NextResponse.json({ error: "Invalid username." }, { status: 400 });
      }
    } else if (typeof body.email === "string") {
      email = body.email.trim().toLowerCase();
    }
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const admin = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let authEmailForLink = "";

  if (username) {
    const { data: profile, error: profErr } = await admin
      .from("profiles")
      .select("id, contact_email")
      .eq("username", username)
      .maybeSingle();

    if (profErr || !profile?.id) {
      return NextResponse.json({ message: "If an account exists, you’ll get an email shortly." }, { status: 200 });
    }

    const { data: userData, error: userErr } = await admin.auth.admin.getUserById(profile.id);
    if (userErr || !userData?.user?.email) {
      return NextResponse.json({ message: "If an account exists, you’ll get an email shortly." }, { status: 200 });
    }

    authEmailForLink = userData.user.email;
    const contact = typeof profile.contact_email === "string" ? profile.contact_email.trim() : "";

    if (isInternalAuthEmail(authEmailForLink) && !contact) {
      return NextResponse.json(
        {
          error:
            "Add an email in Settings first so we can send a reset link. (Sign-in is still your username.)",
        },
        { status: 400 }
      );
    }

    email = contact || authEmailForLink;
  } else {
    if (!email || !EMAIL_FORMAT.test(email)) {
      return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
    }
    authEmailForLink = email;
  }

  const redirectTo = origin ? `${origin}/api/auth/callback?next=/reset-password` : "";

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: authEmailForLink,
    options: redirectTo ? { redirectTo } : undefined,
  });

  if (linkError) {
    const msg = typeof linkError.message === "string" ? linkError.message : String(linkError ?? "");
    const likelyMissingUser = /user not found|not found|does not exist|no user|invalid login|email address.*invalid|signups not allowed/i.test(
      msg
    );
    if (likelyMissingUser) {
      return NextResponse.json(
        { message: "If an account exists, you’ll get an email shortly." },
        { status: 200 }
      );
    }
    console.error("Password reset generateLink:", linkError);
    return NextResponse.json(
      {
        error:
          "We couldn’t create a reset link right now. Try again in a few minutes. If it keeps failing, the app’s email or auth setup may need fixing.",
      },
      { status: 502 }
    );
  }

  const props = linkData && typeof linkData === "object" && "properties" in linkData ? (linkData as { properties?: { action_link?: string } }).properties : undefined;
  let actionLink =
    props?.action_link ?? (linkData as { action_link?: string } | null)?.action_link;

  if (!actionLink || typeof actionLink !== "string") {
    console.error("Password reset: generateLink returned no action_link", linkData);
    return NextResponse.json(
      {
        error:
          "We couldn’t create a reset link right now. Try again later or contact support.",
      },
      { status: 502 }
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
