/**
 * Resend’s default `onboarding@resend.dev` is a sandbox: mail only reaches the address on your Resend account.
 * For real users, set RESEND_FROM_EMAIL to a sender on a domain you verified in Resend (e.g. Proveit <noreply@yoursite.com>).
 */
export function getResendFromOrProductionError():
  | { ok: true; from: string }
  | { ok: false; error: string; status: number } {
  const custom = process.env.RESEND_FROM_EMAIL?.trim();
  if (custom) return { ok: true, from: custom };

  if (process.env.NODE_ENV === "production") {
    return {
      ok: false,
      status: 503,
      error:
        "Production email needs a real sender address. In Vercel: Project, then Settings, then Environment Variables. Add RESEND_FROM_EMAIL (copy this name exactly) with a value like: Proveit <noreply@yourdomain.com> using a domain you verified in Resend. Until then, Resend only delivers to your own test inbox, not your users.",
    };
  }

  return { ok: true, from: "Proveit <onboarding@resend.dev>" };
}
