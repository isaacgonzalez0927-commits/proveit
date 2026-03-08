import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

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
    const msg = linkError.message.toLowerCase();
    if (msg.includes("already") || msg.includes("confirmed")) {
      return NextResponse.json(
        { message: "This email is already confirmed. You're all set." },
        { status: 200 }
      );
    }
    return NextResponse.json({ error: linkError.message }, { status: 400 });
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

  const from = process.env.RESEND_FROM_EMAIL ?? "ProveIt <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "ProveIt/1.0",
    },
    body: JSON.stringify({
      from,
      to: [user.email],
      subject: "Confirm your ProveIt email",
      html: `
        <p>Click the link below to confirm your email for ProveIt:</p>
        <p><a href="${actionLink}">Confirm email</a></p>
        <p>If you didn't request this, you can ignore this email.</p>
      `,
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
