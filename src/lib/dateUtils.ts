import { isValid, parseISO } from "date-fns";

export function safeParseISO(value: unknown): Date | null {
  if (typeof value !== "string" || value.length === 0) return null;
  try {
    const parsed = parseISO(value);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Leading `yyyy-MM-dd` from a submission `date` value (handles `2026-04-11T12:00:00Z`).
 */
export function extractCalendarDateKey(value: string): string | null {
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/** Parse a calendar date in the user's local timezone (not UTC midnight from ISO). */
export function parseCalendarDateLocal(dateKey: string): Date | null {
  const key = extractCalendarDateKey(dateKey);
  if (!key) return null;
  const [y, mo, d] = key.split("-").map((n) => Number(n));
  if (![y, mo, d].every((n) => Number.isFinite(n))) return null;
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return dt;
}
