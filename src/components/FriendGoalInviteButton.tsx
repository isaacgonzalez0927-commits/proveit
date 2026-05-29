"use client";

import { useCallback, useState } from "react";
import { UserPlus } from "lucide-react";
import { friendGoalShareMessage } from "@/lib/friendGoals";
import { fetchOrCreateFriendInvite } from "@/lib/friendGoalClient";

interface FriendGoalInviteButtonProps {
  goalId: string;
  goalTitle: string;
  className?: string;
  compact?: boolean;
}

/** Subtle “add a buddy” action on an existing goal card. */
export function FriendGoalInviteButton({
  goalId,
  goalTitle,
  className = "",
  compact = true,
}: FriendGoalInviteButtonProps) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const inviteBuddy = async () => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const url = await fetchOrCreateFriendInvite(goalId);
      const text = friendGoalShareMessage(goalTitle, url);
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ title: `Join my goal: ${goalTitle}`, text, url });
          setMessage("Invite sent!");
          return;
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return;
        }
      }
      await navigator.clipboard.writeText(text);
      setMessage("Invite copied!");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not invite.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => void inviteBuddy()}
        disabled={busy}
        className={`inline-flex items-center gap-1 font-bold text-sky-700 underline-offset-2 hover:underline disabled:opacity-60 dark:text-sky-300 ${
          compact ? "text-[10px]" : "text-xs"
        }`}
      >
        <UserPlus className="h-3 w-3" />
        {busy ? "…" : "Add a buddy"}
      </button>
      {message && (
        <p
          className={`mt-0.5 ${compact ? "text-[10px]" : "text-xs"} ${
            /could not|migration|not set up/i.test(message)
              ? "text-red-600 dark:text-red-300"
              : "text-emerald-700 dark:text-emerald-300"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
