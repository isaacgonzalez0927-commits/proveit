"use client";

import { useEffect, useState } from "react";
import { Share2, Users, X } from "lucide-react";
import { friendGoalShareMessage } from "@/lib/friendGoals";

interface FriendGoalShareSheetProps {
  open: boolean;
  goalTitle: string;
  inviteUrl: string | null;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
}

/** Post-create sheet to send a buddy invite. */
export function FriendGoalShareSheet({
  open,
  goalTitle,
  inviteUrl,
  loading,
  error,
  onClose,
}: FriendGoalShareSheetProps) {
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!open) setNotice(null);
  }, [open]);

  if (!open) return null;

  const share = async () => {
    if (!inviteUrl) return;
    setNotice(null);
    const text = friendGoalShareMessage(goalTitle, inviteUrl);
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: `Join my goal: ${goalTitle}`,
          text,
          url: inviteUrl,
        });
        setNotice("Invite sent!");
        return;
      }
      await navigator.clipboard.writeText(text);
      setNotice("Copied — paste into a message!");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setNotice("Could not share. Try copy link.");
    }
  };

  const copyLink = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setNotice("Link copied!");
    } catch {
      setNotice("Could not copy.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="buddy-share-title"
    >
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/90 shadow-2xl dark:border-slate-600/60 glass-card">
        <div className="flex items-start justify-between gap-2 border-b border-slate-200/70 px-5 py-4 dark:border-slate-700/60">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-prove-600 text-white">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <p id="buddy-share-title" className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Invite your buddy
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Share your goal link</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-slate-900 dark:text-white">{goalTitle}</span> is ready.
            Send this link so you can cheer each other on.
          </p>

          {loading && (
            <p className="mt-4 text-center text-sm text-slate-500">Creating your invite link…</p>
          )}
          {error && (
            <p className="mt-4 rounded-xl border border-red-200/80 bg-red-50/90 px-3 py-2 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200">
              {error}
            </p>
          )}
          {inviteUrl && !loading && (
            <p className="mt-3 break-all rounded-xl border border-dashed border-slate-200 bg-white/60 px-3 py-2 font-mono text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-400">
              {inviteUrl}
            </p>
          )}

          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              disabled={!inviteUrl || loading}
              onClick={() => void share()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-prove-600 py-3 text-sm font-semibold text-white hover:bg-prove-700 disabled:opacity-50 btn-glass-primary"
            >
              <Share2 className="h-4 w-4" />
              Send invite
            </button>
            <button
              type="button"
              disabled={!inviteUrl || loading}
              onClick={() => void copyLink()}
              className="w-full rounded-xl border border-prove-200/90 bg-white/70 py-2.5 text-sm font-medium text-prove-800 transition hover:bg-prove-50 dark:border-prove-800/60 dark:bg-slate-900/50 dark:text-prove-200 dark:hover:bg-prove-950/50 btn-glass-outline"
            >
              Copy link
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-2 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              I&apos;ll invite them later
            </button>
          </div>
          {notice && (
            <p className="mt-3 text-center text-xs font-medium text-emerald-700 dark:text-emerald-300">
              {notice}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
