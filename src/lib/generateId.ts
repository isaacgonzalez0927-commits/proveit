/** Generate a unique string id (safe for API routes and client). */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
