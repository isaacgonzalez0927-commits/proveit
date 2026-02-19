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
