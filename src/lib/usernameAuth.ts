/** Supabase requires an email-shaped identifier; username accounts use this domain. */
export const AUTH_INTERNAL_EMAIL_DOMAIN =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_AUTH_INTERNAL_EMAIL_DOMAIN?.trim()) ||
  "proveit.account.internal";

const EMAIL_FORMAT = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/;

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "help",
  "support",
  "proveit",
  "system",
  "root",
  "api",
  "www",
  "mail",
  "team",
]);

export function isInternalAuthEmail(email: string | null | undefined): boolean {
  if (!email || !email.includes("@")) return false;
  const domain = email.split("@").pop()?.toLowerCase() ?? "";
  return domain === AUTH_INTERNAL_EMAIL_DOMAIN.toLowerCase();
}

export function authEmailToUsername(email: string | null | undefined): string | null {
  if (!email || !isInternalAuthEmail(email)) return null;
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  return local || null;
}

/** Returns normalized username or null if invalid / reserved. */
export function normalizeUsername(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  if (!USERNAME_RE.test(s)) return null;
  if (RESERVED_USERNAMES.has(s)) return null;
  return s;
}

export function usernameToAuthEmail(username: string): string {
  return `${username.toLowerCase()}@${AUTH_INTERNAL_EMAIL_DOMAIN}`;
}

/**
 * Sign-in identifier: real email (legacy) or username → synthetic auth email.
 */
export function loginIdentifierToAuthEmail(identifier: string): string | null {
  const t = identifier.trim();
  if (!t) return null;
  if (t.includes("@")) {
    const lower = t.toLowerCase();
    if (!EMAIL_FORMAT.test(lower)) return null;
    return lower;
  }
  const u = normalizeUsername(t);
  if (!u) return null;
  return usernameToAuthEmail(u);
}

export function accountDisplayLabel(user: {
  name?: string;
  username?: string;
  contactEmail?: string;
  email?: string;
}): string {
  if (user.name?.trim()) return user.name.trim();
  if (user.username) return `@${user.username}`;
  if (user.contactEmail?.trim()) return user.contactEmail.trim();
  if (user.email && !isInternalAuthEmail(user.email)) return user.email;
  const u = authEmailToUsername(user.email);
  if (u) return `@${u}`;
  return "Account";
}
