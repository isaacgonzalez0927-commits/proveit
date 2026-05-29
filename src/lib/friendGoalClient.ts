/** Client helpers for friend-goal invites. */

export async function fetchOrCreateFriendInvite(goalId: string): Promise<string> {
  const existing = await fetch(`/api/friend-goals?goalId=${encodeURIComponent(goalId)}`, {
    credentials: "same-origin",
  });
  const existingData = await existing.json().catch(() => ({}));
  if (!existing.ok) {
    throw new Error(
      typeof existingData.error === "string" ? existingData.error : "Could not load invite."
    );
  }
  if (existingData?.invite?.inviteUrl) return existingData.invite.inviteUrl as string;

  const res = await fetch("/api/friend-goals", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ goalId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Could not create invite.");
  }
  const url = data.invite?.inviteUrl as string | undefined;
  if (!url) throw new Error("Server did not return an invite link.");
  return url;
}
