/**
 * Resend’s default `onboarding@resend.dev` is a sandbox: mail only reaches the address on your Resend account.
 * For real users, set RESEND_FROM_EMAIL (or other keys in readResendFromEnv) to a sender on a domain you verified in Resend.
 */

/** Strip whitespace and optional wrapping quotes (common when pasting in Vercel). */
export function trimEnvEmail(value: string | undefined): string | undefined {
  if (value == null) return undefined;
  let t = value.replace(/^\uFEFF/, "").replace(/\u200b/g, "").trim();
  if (t.length === 0) return undefined;
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    t = t.slice(1, -1).trim();
  }
  return t.length > 0 ? t : undefined;
}

/**
 * First non-empty env wins. Each name must be read as a **static** `process.env.NAME`
 * expression — Next.js inlines those at build time; `process.env[variable]` loops break in production.
 */
export function readResendFromEnv(): string | undefined {
  const a = trimEnvEmail(process.env.RESEND_FROM_EMAIL);
  if (a) return a;
  const b = trimEnvEmail(process.env.RESEND_FROM);
  if (b) return b;
  const c = trimEnvEmail(process.env.EMAIL_FROM);
  if (c) return c;
  const d = trimEnvEmail(process.env.MAIL_FROM);
  if (d) return d;
  const e = trimEnvEmail(process.env.NEXT_PUBLIC_RESEND_FROM_EMAIL);
  if (e) return e;
  const f = trimEnvEmail(process.env.RESEND_EMAIL_FROM);
  if (f) return f;
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
      "The server still does not see a verified Resend sender. Do this on Vercel: (1) Project → Settings → Environment Variables. (2) Add RESEND_FROM_EMAIL with value like Proveit <noreply@yourdomain.com> where the domain is verified in Resend. (3) Enable the **Production** checkbox for that variable (not only Preview). (4) Save, then Deployments → open latest Production deployment → Redeploy. (5) Open /api/health/email on your live site — senderResolved should be true. No extra quotes in the Vercel value. Names we accept: RESEND_FROM_EMAIL, RESEND_FROM, RESEND_EMAIL_FROM, EMAIL_FROM, MAIL_FROM, NEXT_PUBLIC_RESEND_FROM_EMAIL.",
  };
}
