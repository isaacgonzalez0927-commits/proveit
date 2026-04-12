/** Prefer server `error` or `message` string; otherwise use fallback. */
export function messageFromApiPayload(data: unknown, fallback: string): string {
  if (data && typeof data === "object") {
    const err = (data as { error?: unknown }).error;
    if (typeof err === "string" && err.trim()) return err.trim();
    const msg = (data as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg.trim();
  }
  return fallback;
}
