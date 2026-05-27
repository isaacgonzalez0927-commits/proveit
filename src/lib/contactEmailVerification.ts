import crypto from "crypto";
import { getResendFromOrProductionError } from "@/lib/resendFrom";
import { readResendErrorMessage } from "@/lib/resendHttp";

export const CONTACT_EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

export function createContactEmailVerifyToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function contactEmailVerifyExpiresAtISO(): string {
  return new Date(Date.now() + CONTACT_EMAIL_VERIFY_TTL_MS).toISOString();
}

export function buildContactEmailVerifyUrl(origin: string, token: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/api/auth/verify-contact-email?token=${encodeURIComponent(token)}`;
}

export async function sendContactEmailVerification(args: {
  to: string;
  verifyUrl: string;
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (!resendApiKey) {
    return { ok: false, error: "Email is not configured (RESEND_API_KEY).", status: 501 };
  }

  const fromResult = getResendFromOrProductionError();
  if (!fromResult.ok) {
    return { ok: false, error: fromResult.error, status: fromResult.status };
  }

  const escapedLink = args.verifyUrl.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f1f5f9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border-radius:16px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);overflow:hidden;">
        <tr><td style="padding:32px 24px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Verify your contact email</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#475569;">Confirm this address for Proveit password reset and account recovery. The link expires in 24 hours.</p>
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:10px;background:#16a34a;"><a href="${escapedLink}" target="_blank" rel="noopener" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Verify email</a></td></tr></table>
          <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;">If you didn’t request this, you can ignore this email.</p>
        </td></tr>
        <tr><td style="padding:16px 24px;background:#f8fafc;font-size:12px;color:#64748b;">Proveit – Set goals. Take a photo. Prove it.</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "Proveit/1.0",
    },
    body: JSON.stringify({
      from: fromResult.from,
      to: [args.to],
      subject: "Verify your Proveit contact email",
      html,
    }),
  });

  if (!res.ok) {
    const msg = await readResendErrorMessage(res);
    return { ok: false, error: `Resend: ${msg}`, status: 502 };
  }

  return { ok: true };
}

export function isContactEmailVerified(row: {
  contact_email?: unknown;
  contact_email_verified_at?: unknown;
}): boolean {
  const email = typeof row.contact_email === "string" ? row.contact_email.trim() : "";
  if (!email) return false;
  return row.contact_email_verified_at != null;
}
