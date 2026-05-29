"use client";

import { useCallback, useState } from "react";
import { Link2, Share2, Users } from "lucide-react";
import { friendGoalShareMessage } from "@/lib/friendGoals";

interface FriendGoalInviteButtonProps {
  goalId: string;
  goalTitle: string;
  className?: string;
  compact?: boolean;
}

export function FriendGoalInviteButton({
  goalId,
  goalTitle,
  className = "",
  compact = false,
}: FriendGoalInviteButtonProps) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const ensureInvite = useCallback(async (): Promise<string> => {
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
  }, [goalId]);

  const shareInvite = async () => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const url = inviteUrl ?? (await ensureInvite());
      if (!url) throw new Error("No invite link returned.");
      setInviteUrl(url);
      const text = friendGoalShareMessage(goalTitle, url);
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ title: `Join my goal: ${goalTitle}`, text, url });
          setMessage("Invite shared.");
          return;
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return;
        }
      }
      await navigator.clipboard.writeText(text);
      setMessage("Invite link copied.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not share invite.");
    } finally {
      setBusy(false);
    }
  };

  const copyOnly = async () => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const url = inviteUrl ?? (await ensureInvite());
      if (!url) throw new Error("No invite link returned.");
      setInviteUrl(url);
      await navigator.clipboard.writeText(url);
      setMessage("Link copied.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not copy link.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => void shareInvite()}
          disabled={busy}
          className={`inline-flex items-center gap-1 rounded-lg border border-emerald-200/90 bg-emerald-50/80 font-semibold text-emerald-900 hover:bg-emerald-100/90 disabled:opacity-60 dark:border-emerald-800/80 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:bg-emerald-900/50 ${
            compact ? "px-2 py-1 text-[10px]" : "px-2.5 py-1.5 text-xs"
          }`}
        >
          {busy ? (
            <Users className="h-3 w-3 animate-pulse" />
          ) : (
            <Share2 className="h-3 w-3" />
          )}
          {busy ? "…" : "Invite friend"}
        </button>
        <button
          type="button"
          onClick={() => void copyOnly()}
          disabled={busy}
          className={`inline-flex items-center gap-1 rounded-lg border border-slate-200/90 bg-white/70 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700 ${
            compact ? "p-1" : "px-2 py-1.5 text-xs"
          }`}
          aria-label="Copy invite link"
        >
          <Link2 className="h-3 w-3" />
        </button>
      </div>
      {message && (
        <p
          className={`mt-1 ${compact ? "text-[10px]" : "text-xs"} ${
            /could not|not set up|migration|unauthorized/i.test(message)
              ? "text-red-700 dark:text-red-300"
              : "text-emerald-800 dark:text-emerald-200"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
