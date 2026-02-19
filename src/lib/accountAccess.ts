const CREATOR_EMAILS = new Set([
  "isaacgonzalez0927@gmail.com",
]);

export function hasCreatorAccess(email?: string | null): boolean {
  if (!email) return false;
  return CREATOR_EMAILS.has(email.trim().toLowerCase());
}
