import { NextRequest, NextResponse } from "next/server";
import {
  DUPLICATE_EMAIL_MESSAGE,
  isEmailUsedByAnotherAccount,
  isValidAccountEmail,
  normalizeAccountEmail,
} from "@/lib/accountEmailUniqueness";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabaseAdmin";

/** Authenticated check before changing login or contact email. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Server not configured." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const raw =
    typeof body === "object" && body && "email" in body
      ? (body as { email?: string }).email
      : undefined;
  const email = typeof raw === "string" ? normalizeAccountEmail(raw) : "";
  if (!email || !isValidAccountEmail(email)) {
    return NextResponse.json({ available: false, error: "Enter a valid email address." });
  }

  if (user.email && normalizeAccountEmail(user.email) === email) {
    return NextResponse.json({ available: true });
  }

  const taken = await isEmailUsedByAnotherAccount(admin, email, user.id);
  return NextResponse.json({
    available: !taken,
    error: taken ? DUPLICATE_EMAIL_MESSAGE : undefined,
  });
}
