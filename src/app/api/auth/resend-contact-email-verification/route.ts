import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildContactEmailVerifyUrl,
  contactEmailVerifyExpiresAtISO,
  createContactEmailVerifyToken,
  sendContactEmailVerification,
} from "@/lib/contactEmailVerification";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: row, error: fetchErr } = await supabase
    .from("profiles")
    .select("contact_email_pending")
    .eq("id", user.id)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 400 });
  }

  const pending =
    typeof row?.contact_email_pending === "string" ? row.contact_email_pending.trim().toLowerCase() : "";
  if (!pending) {
    return NextResponse.json({ error: "No pending contact email to verify." }, { status: 400 });
  }

  let origin = "";
  try {
    const body = await request.json().catch(() => ({}));
    const rawOrigin = body.origin ?? request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
    origin = rawOrigin ? (rawOrigin.startsWith("http") ? rawOrigin : `https://${rawOrigin}`) : "";
  } catch {
    origin = "";
  }
  if (!origin) {
    return NextResponse.json({ error: "Could not determine site URL." }, { status: 400 });
  }

  const token = createContactEmailVerifyToken();
  const { error: upErr } = await supabase
    .from("profiles")
    .update({
      contact_email_verify_token: token,
      contact_email_verify_expires_at: contactEmailVerifyExpiresAtISO(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 400 });
  }

  const sent = await sendContactEmailVerification({
    to: pending,
    verifyUrl: buildContactEmailVerifyUrl(origin, token),
  });

  if (!sent.ok) {
    return NextResponse.json({ error: sent.error }, { status: sent.status });
  }

  return NextResponse.json({
    message: "Verification email sent. Check your inbox and spam folder.",
  });
}
