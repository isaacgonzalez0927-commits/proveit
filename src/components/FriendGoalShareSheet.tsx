"use client";

import { useEffect, useState } from "react";
import { PartyPopper, Share2, X } from "lucide-react";
import { friendGoalShareMessage } from "@/lib/friendGoals";

interface FriendGoalShareSheetProps {
  open: boolean;
  goalTitle: string;
  inviteUrl: string | null;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
}

/** Duolingo-style post-create sheet to send a buddy invite. */
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
      className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-900/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="buddy-share-title"
    >
      <div className="w-full max-w-md overflow-hidden rounded-3xl border-2 border-sky-300 bg-gradient-to-b from-sky-50 to-white shadow-2xl dark:border-sky-600 dark:from-slate-900 dark:to-slate-950">
        <div className="flex items-start justify-between gap-2 border-b border-sky-100 bg-sky-100/80 px-5 py-4 dark:border-sky-900 dark:bg-sky-950/50">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-emerald-500 text-white shadow">
              <PartyPopper className="h-5 w-5" />
            </span>
            <div>
              <p id="buddy-share-title" className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Invite your buddy!
              </p>
              <p className="text-xs font-medium text-sky-800 dark:text-sky-200">Almost a duo goal</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-500 hover:bg-white/80 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            <span className="font-bold text-slate-900 dark:text-white">{goalTitle}</span> is ready.
            Send this link so you can cheer each other on.
          </p>

          {loading && (
            <p className="mt-4 text-center text-sm font-medium text-sky-700 dark:text-sky-300">
              Cooking up your invite link…
            </p>
          )}
          {error && (
            <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">
              {error}
            </p>
          )}
          {inviteUrl && !loading && (
            <p className="mt-3 break-all rounded-xl border-2 border-dashed border-sky-200 bg-white px-3 py-2 font-mono text-[11px] text-slate-600 dark:border-sky-800 dark:bg-slate-900 dark:text-slate-400">
              {inviteUrl}
            </p>
          )}

          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              disabled={!inviteUrl || loading}
              onClick={() => void share()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-emerald-700 bg-emerald-500 py-3.5 text-sm font-extrabold uppercase tracking-wide text-white shadow active:translate-y-0.5 active:border-b-2 disabled:opacity-50"
            >
              <Share2 className="h-4 w-4" />
              Send invite
            </button>
            <button
              type="button"
              disabled={!inviteUrl || loading}
              onClick={() => void copyLink()}
              className="w-full rounded-2xl border-2 border-sky-200 bg-white py-2.5 text-sm font-bold text-sky-800 hover:bg-sky-50 dark:border-sky-700 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800"
            >
              Copy link
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400"
            >
              I&apos;ll invite them later
            </button>
          </div>
          {notice && (
            <p className="mt-3 text-center text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              {notice}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
