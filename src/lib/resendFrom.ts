/**
 * Resend `onboarding@resend.dev` is a sandbox: you can only send to your own Resend account email.
 * To email real users (password reset, confirmations), set RESEND_FROM_EMAIL to an address on your
 * verified domain in the Resend dashboard (e.g. Proveit <noreply@yourdomain.com>).
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
        "Email sender is not configured. In Vercel (or your host), set RESEND_FROM_EMAIL to an address on your verified Resend domain — for example: Proveit <noreply@yourdomain.com>. Without this, Resend only allows the test inbox (your own email).",
    };
  }

  return { ok: true, from: "Proveit <onboarding@resend.dev>" };
}
