"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { BuddyProfileHero } from "@/components/BuddyProfileHero";
import { setPostAuthRedirect } from "@/lib/postAuthRedirect";
import type { BuddyProfilePublic } from "@/lib/buddyProfile";
import { buddyProfileBackgroundStyle } from "@/lib/buddyProfile";
import type { GoalPlantVariant } from "@/lib/goalPlants";
import type { AccentTheme } from "@/lib/theme";
import { BuddyProfileAvatar } from "@/components/BuddyProfileAvatar";

interface LinkPreview {
  userId: string;
  displayName: string;
  avatarPlant: number;
  accentTheme: string;
  visibility: string;
}

export default function BuddyConnectPage() {
  const params = useParams();
  const router = useRouter();
  const code = typeof params.code === "string" ? params.code : "";
  const { user, authReady } = useApp();
  const [preview, setPreview] = useState<LinkPreview | null>(null);
  const [profile, setProfile] = useState<BuddyProfilePublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (authReady && !user && code) {
      setPostAuthRedirect(`/buddy-connect/${code}`);
    }
  }, [authReady, user, code]);

  useEffect(() => {
    if (!code) {
      setError("Invalid friend link.");
      setLoading(false);
      return;
    }
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/buddy-profile/preview/${encodeURIComponent(code)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(typeof data.error === "string" ? data.error : "Link not found.");
        }
        setPreview(data.preview as LinkPreview);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load link.");
      } finally {
        setLoading(false);
      }
    })();
  }, [code]);

  const connect = useCallback(async () => {
    if (!code || connecting) return;
    setConnecting(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch("/api/buddy-profile/connect", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not connect.");
      }
      setProfile(data.profile as BuddyProfilePublic);
      setNotice("You are connected! You can view their buddy profile anytime.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect.");
    } finally {
      setConnecting(false);
    }
  }, [code, connecting]);

  const previewAccent = (preview?.accentTheme ?? "green") as AccentTheme;
  const previewPlant = (preview?.avatarPlant ?? 1) as GoalPlantVariant;

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 pb-24 pt-8">
      {loading && <p className="text-center text-sm text-slate-500">Loading friend link…</p>}

      {error && !preview && (
        <div className="rounded-2xl p-6 text-center glass-card">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {preview && !profile && (
        <div className="overflow-hidden rounded-2xl glass-card">
          <div className="relative px-4 py-8" style={buddyProfileBackgroundStyle(previewAccent)}>
            <p className="text-center text-xs font-semibold uppercase tracking-wide text-slate-800/80 dark:text-white/80">
              Buddy invite
            </p>
            <div className="mx-auto mt-4 flex justify-center">
              <BuddyProfileAvatar variant={previewPlant} accentTheme={previewAccent} size="lg" />
            </div>
            <h1 className="mt-4 text-center font-display text-xl font-bold text-slate-900 dark:text-white">
              {preview.displayName}
            </h1>
            <p className="mt-1 text-center text-sm text-slate-700 dark:text-slate-200">
              wants to connect on Proveit
            </p>
          </div>

          <div className="p-4">
            {!authReady ? (
              <p className="text-sm text-slate-500">Checking sign-in…</p>
            ) : !user ? (
              <>
                <Link
                  href="/?step=login"
                  className="flex w-full justify-center rounded-xl bg-prove-600 px-4 py-3 text-sm font-semibold text-white hover:bg-prove-700 btn-glass-primary"
                >
                  Sign in to connect
                </Link>
                <p className="mt-2 text-center text-xs text-slate-500">
                  New here? Create an account, then open this link again.
                </p>
              </>
            ) : (
              <button
                type="button"
                disabled={connecting}
                onClick={() => void connect()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-prove-600 px-4 py-3 text-sm font-semibold text-white hover:bg-prove-700 disabled:opacity-60 btn-glass-primary"
              >
                <Users className="h-4 w-4" />
                {connecting ? "Connecting…" : "Connect as buddies"}
              </button>
            )}
            {error && <p className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
          </div>
        </div>
      )}

      {profile && (
        <>
          {notice && (
            <p className="mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
              {notice}
            </p>
          )}
          <BuddyProfileHero profile={profile} />
          <button
            type="button"
            onClick={() => router.push(`/profile/${profile.userId}`)}
            className="mt-4 w-full rounded-xl border border-prove-200 py-2.5 text-sm font-semibold text-prove-800 dark:border-prove-800 dark:text-prove-200"
          >
            Open full profile
          </button>
        </>
      )}

      <Link
        href="/dashboard"
        className="mt-8 block text-center text-sm text-prove-600 hover:underline dark:text-prove-400"
      >
        ← Home
      </Link>
    </main>
  );
}
