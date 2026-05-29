"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { setPostAuthRedirect } from "@/lib/postAuthRedirect";

interface InvitePreview {
  code: string;
  title: string;
  timesPerWeek: number;
  ownerName: string;
  memberCount: number;
  maxMembers: number;
  isFull: boolean;
  alreadyJoined: boolean;
  inviteUrl: string;
}

export default function JoinFriendGoalPage() {
  const params = useParams();
  const router = useRouter();
  const code = typeof params.code === "string" ? params.code : "";
  const { user, authReady } = useApp();
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinMessage, setJoinMessage] = useState<string | null>(null);

  useEffect(() => {
    if (authReady && !user && code) {
      setPostAuthRedirect(`/join/${code}`);
    }
  }, [authReady, user, code]);

  useEffect(() => {
    if (!code) {
      setError("Invalid invite link.");
      setLoading(false);
      return;
    }
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/friend-goals/invite/${encodeURIComponent(code)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(typeof data.error === "string" ? data.error : "Invite not found.");
        }
        setInvite(data.invite as InvitePreview);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load invite.");
      } finally {
        setLoading(false);
      }
    })();
  }, [code]);

  const join = useCallback(async () => {
    if (!code || joining) return;
    setJoining(true);
    setJoinMessage(null);
    try {
      const res = await fetch("/api/friend-goals/join", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not join.");
      }
      setJoinMessage("You're in! Reloading your goals…");
      window.setTimeout(() => {
        router.replace("/friends");
        window.location.reload();
      }, 800);
    } catch (err) {
      setJoinMessage(err instanceof Error ? err.message : "Could not join.");
    } finally {
      setJoining(false);
    }
  }, [code, joining, router]);

  const scheduleLabel =
    invite && invite.timesPerWeek >= 7
      ? "Every day"
      : invite
        ? `${invite.timesPerWeek}× per week`
        : "";

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 pb-24 pt-8">
      <div className="rounded-2xl border border-slate-200/70 p-6 shadow-soft glass-card dark:border-slate-700/60">
        <div className="flex items-center gap-2 text-prove-600 dark:text-prove-400">
          <Users className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-wide">Friend goal</span>
        </div>

        {loading && <p className="mt-6 text-sm text-slate-500">Loading invite…</p>}

        {error && (
          <p className="mt-6 text-sm text-red-700 dark:text-red-300">{error}</p>
        )}

        {invite && !error && (
          <>
            <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">{invite.title}</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              <span className="font-medium text-slate-800 dark:text-slate-200">{invite.ownerName}</span>{" "}
              invited you · {scheduleLabel}
            </p>

            {invite.isFull && !invite.alreadyJoined && (
              <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                This goal already has two people. Ask your friend to start a new invite.
              </p>
            )}

            {invite.alreadyJoined && (
              <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-300">
                You&apos;re already on this friend goal.
              </p>
            )}

            <div className="mt-6 flex flex-col gap-2">
              {!authReady ? (
                <p className="text-sm text-slate-500">Checking sign-in…</p>
              ) : !user ? (
                <>
                  <Link
                    href="/?step=login"
                    className="inline-flex justify-center rounded-xl bg-prove-600 px-4 py-3 text-sm font-semibold text-white hover:bg-prove-700"
                  >
                    Sign in to join
                  </Link>
                  <p className="text-center text-xs text-slate-500">
                    New here? Create an account, then open this link again.
                  </p>
                </>
              ) : invite.alreadyJoined ? (
                <Link
                  href="/friends"
                  className="inline-flex justify-center rounded-xl bg-prove-600 px-4 py-3 text-sm font-semibold text-white hover:bg-prove-700"
                >
                  View friend goals
                </Link>
              ) : invite.isFull ? null : (
                <button
                  type="button"
                  onClick={() => void join()}
                  disabled={joining}
                  className="inline-flex justify-center rounded-xl bg-prove-600 px-4 py-3 text-sm font-semibold text-white hover:bg-prove-700 disabled:opacity-60"
                >
                  {joining ? "Joining…" : "Join this goal"}
                </button>
              )}
            </div>

            {joinMessage && (
              <p className="mt-3 text-center text-sm text-slate-600 dark:text-slate-400">{joinMessage}</p>
            )}
          </>
        )}
      </div>

      <Link
        href="/dashboard"
        className="mt-8 block text-center text-sm text-prove-600 hover:underline dark:text-prove-400"
      >
        ← Home
      </Link>
    </main>
  );
}
