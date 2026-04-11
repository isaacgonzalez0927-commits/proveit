const CREATOR_EMAILS = new Set([
  "isaacgonzalez0927@gmail.com",
  "ranchdressing971@gmail.com",
]);

export function hasCreatorAccess(
  email?: string | null,
  contactEmail?: string | null
): boolean {
  if (email && CREATOR_EMAILS.has(email.trim().toLowerCase())) return true;
  if (contactEmail && CREATOR_EMAILS.has(contactEmail.trim().toLowerCase())) return true;
  return false;
}
