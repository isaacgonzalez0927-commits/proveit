import type { SupabaseClient } from "@supabase/supabase-js";
import { isInternalAuthEmail, normalizeUsername, usernameToAuthEmail } from "@/lib/usernameAuth";

const EMAIL_FORMAT = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/;

export function normalizeAccountEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidAccountEmail(email: string): boolean {
  return EMAIL_FORMAT.test(normalizeAccountEmail(email));
}

async function rpcAuthEmailExists(
  admin: SupabaseClient,
  email: string
): Promise<boolean> {
  const { data, error } = await admin.rpc("auth_email_exists", {
    check_email: normalizeAccountEmail(email),
  });
  if (error) {
    console.error("[accountEmailUniqueness] auth_email_exists", error.message);
    return false;
  }
  return data === true;
}

async function rpcProfileContactEmailTaken(
  admin: SupabaseClient,
  email: string,
  excludeUserId?: string
): Promise<boolean> {
  const { data, error } = await admin.rpc("profile_contact_email_taken", {
    check_email: normalizeAccountEmail(email),
    exclude_id: excludeUserId ?? null,
  });
  if (error) {
    console.error("[accountEmailUniqueness] profile_contact_email_taken", error.message);
    return false;
  }
  return data === true;
}

async function authUserIdForEmail(
  admin: SupabaseClient,
  email: string
): Promise<string | null> {
  const { data, error } = await admin.rpc("auth_user_id_for_email", {
    check_email: normalizeAccountEmail(email),
  });
  if (error) {
    console.error("[accountEmailUniqueness] auth_user_id_for_email", error.message);
    return null;
  }
  return typeof data === "string" ? data : null;
}

/** True if another account already uses this login email (auth.users / profiles.email). */
export async function isAuthLoginEmailTaken(
  admin: SupabaseClient,
  loginEmail: string,
  excludeUserId?: string
): Promise<boolean> {
  const normalized = normalizeAccountEmail(loginEmail);
  if (!normalized) return false;

  const ownerId = await authUserIdForEmail(admin, normalized);
  if (ownerId) {
    return excludeUserId ? ownerId !== excludeUserId : true;
  }

  const { data: profileRow } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", normalized)
    .maybeSingle();

  if (!profileRow?.id) return false;
  return excludeUserId ? profileRow.id !== excludeUserId : true;
}

/** True if another account uses this address as contact or pending contact email. */
export async function isContactEmailTaken(
  admin: SupabaseClient,
  email: string,
  excludeUserId?: string
): Promise<boolean> {
  const normalized = normalizeAccountEmail(email);
  if (!normalized || !isValidAccountEmail(normalized)) return false;
  if (isInternalAuthEmail(normalized)) return false;
  return rpcProfileContactEmailTaken(admin, normalized, excludeUserId);
}

/** Blocks duplicate real emails across login + contact fields. */
export async function isEmailUsedByAnotherAccount(
  admin: SupabaseClient,
  email: string,
  excludeUserId?: string
): Promise<boolean> {
  const normalized = normalizeAccountEmail(email);
  if (!normalized || !isValidAccountEmail(normalized)) return false;
  if (isInternalAuthEmail(normalized)) return false;

  if (await isContactEmailTaken(admin, normalized, excludeUserId)) return true;
  if (await isAuthLoginEmailTaken(admin, normalized, excludeUserId)) return true;
  return false;
}

/** Sign-up: username handle + synthetic auth email must both be unused. */
export async function isUsernameSignupTaken(
  admin: SupabaseClient,
  username: string
): Promise<boolean> {
  const u = normalizeUsername(username);
  if (!u) return true;

  const { data: profileRow } = await admin
    .from("profiles")
    .select("id")
    .eq("username", u)
    .maybeSingle();
  if (profileRow?.id) return true;

  const authEmail = usernameToAuthEmail(u);
  return isAuthLoginEmailTaken(admin, authEmail);
}

export const DUPLICATE_EMAIL_MESSAGE =
  "That email is already linked to another account.";
export const DUPLICATE_USERNAME_MESSAGE = "That username is already taken.";
