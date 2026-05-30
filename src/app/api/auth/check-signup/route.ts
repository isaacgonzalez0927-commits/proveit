import { NextRequest, NextResponse } from "next/server";
import {
  DUPLICATE_USERNAME_MESSAGE,
  isEmailUsedByAnotherAccount,
  isUsernameSignupTaken,
  normalizeAccountEmail,
} from "@/lib/accountEmailUniqueness";
import { createServiceRoleClient } from "@/lib/supabaseAdmin";
import { loginIdentifierToAuthEmail, normalizeUsername } from "@/lib/usernameAuth";

/**
 * Pre-check before sign-up so we never create duplicate auth users.
 * Public (no session) — only returns whether the identifier is available.
 */
export async function POST(request: NextRequest) {
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

  const rawUsername =
    typeof body === "object" && body && "username" in body
      ? (body as { username?: string }).username
      : undefined;
  const rawEmail =
    typeof body === "object" && body && "email" in body
      ? (body as { email?: string }).email
      : undefined;

  if (rawUsername?.trim()) {
    const u = normalizeUsername(rawUsername);
    if (!u) {
      return NextResponse.json({
        available: false,
        error: "Username must be 3–20 characters: letters, numbers, or underscore.",
      });
    }
    const taken = await isUsernameSignupTaken(admin, u);
    return NextResponse.json({
      available: !taken,
      error: taken ? DUPLICATE_USERNAME_MESSAGE : undefined,
    });
  }

  if (rawEmail?.trim()) {
    const authEmail = loginIdentifierToAuthEmail(rawEmail.trim());
    if (!authEmail) {
      return NextResponse.json({ available: false, error: "Enter a valid email address." });
    }
    const taken = await isEmailUsedByAnotherAccount(admin, normalizeAccountEmail(authEmail));
    return NextResponse.json({
      available: !taken,
      error: taken ? "That email is already registered." : undefined,
    });
  }

  return NextResponse.json({ error: "username or email is required." }, { status: 400 });
}
