/**
 * Resend’s default `onboarding@resend.dev` is a sandbox: mail only reaches the address on your Resend account.
 * For real users, set RESEND_FROM_EMAIL (or other keys in readResendFromEnv) to a sender on a domain you verified in Resend.
 */

/** Strip whitespace and optional wrapping quotes (common when pasting in Vercel). */
export function trimEnvEmail(value: string | undefined): string | undefined {
  if (value == null) return undefined;
  let t = value.trim();
  if (t.length === 0) return undefined;
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    t = t.slice(1, -1).trim();
  }
  return t.length > 0 ? t : undefined;
}

/** First non-empty env wins (people mistype or use NEXT_PUBLIC by habit). */
export function readResendFromEnv(): string | undefined {
  const keys = [
    "RESEND_FROM_EMAIL",
    "RESEND_FROM",
    "EMAIL_FROM",
    "MAIL_FROM",
    "NEXT_PUBLIC_RESEND_FROM_EMAIL",
  ] as const;
  for (const k of keys) {
    const v = trimEnvEmail(process.env[k]);
    if (v) return v;
  }
  return undefined;
}

/**
 * True when we must block Resend’s sandbox “from” (only your inbox).
 * Vercel Preview/Development builds use NODE_ENV=production but often lack Production-only env vars —
 * those deployments may use onboarding@resend.dev so flows still work.
 */
export function mustUseVerifiedResendFrom(): boolean {
  if (process.env.NODE_ENV !== "production") return false;
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === "preview" || vercelEnv === "development") return false;
  return true;
}

export function getResendFromOrProductionError():
  | { ok: true; from: string }
  | { ok: false; error: string; status: number } {
  const custom = readResendFromEnv();
  if (custom) return { ok: true, from: custom };

  if (!mustUseVerifiedResendFrom()) {
    return { ok: true, from: "Proveit <onboarding@resend.dev>" };
  }

  return {
    ok: false,
    status: 503,
    error:
      "The server still does not see a verified sender. Fix: Vercel → Project → Settings → Environment Variables → add RESEND_FROM_EMAIL (e.g. Proveit <noreply@yourdomain.com>) on **Production**, save, then **Redeploy** (Deployments → … → Redeploy). Also try: no extra spaces or quotes around the value. Aliases we read: RESEND_FROM_EMAIL, RESEND_FROM, EMAIL_FROM, MAIL_FROM, NEXT_PUBLIC_RESEND_FROM_EMAIL. Branch / Preview URLs use sandbox mail unless you add the same variable for **Preview** too.",
  };
}
