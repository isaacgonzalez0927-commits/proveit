/**
 * Parse Resend POST /emails error responses (JSON or plain text).
 */
export async function readResendErrorMessage(response: Response): Promise<string> {
  const text = await response.text();
  if (!text.trim()) return `Resend request failed (${response.status}).`;
  try {
    const j = JSON.parse(text) as Record<string, unknown>;
    if (typeof j.message === "string" && j.message.trim()) return j.message.trim();
    if (typeof j.error === "string" && j.error.trim()) return j.error.trim();
  } catch {
    /* non-JSON body */
  }
  const t = text.trim();
  return t.length > 200 ? `${t.slice(0, 197)}…` : t;
}
