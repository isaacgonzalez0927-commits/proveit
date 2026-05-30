"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { BuddyProfileHero } from "@/components/BuddyProfileHero";
import { useHideHeader } from "@/context/HideHeaderContext";
import type { BuddyProfilePublic } from "@/lib/buddyProfile";

export default function BuddyProfilePage() {
  const params = useParams();
  const userId = typeof params.userId === "string" ? params.userId : "";
  const [, setHideHeader] = useHideHeader();
  const [profile, setProfile] = useState<BuddyProfilePublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHideHeader(true);
    return () => setHideHeader(false);
  }, [setHideHeader]);

  useEffect(() => {
    if (!userId) {
      setError("Invalid profile.");
      setLoading(false);
      return;
    }
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/buddy-profile/${encodeURIComponent(userId)}`, {
          credentials: "same-origin",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(typeof data.error === "string" ? data.error : "Could not load profile.");
        }
        setProfile(data.profile as BuddyProfilePublic);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load profile.");
        setProfile(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  return (
    <main className="flex min-h-[100dvh] flex-col bg-[var(--bg-app)]">
      <div className="flex shrink-0 items-center gap-2 px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <Link
          href="/friends"
          className="flex h-10 w-10 items-center justify-center rounded-full text-slate-800 active:bg-slate-200/70 dark:text-white dark:active:bg-white/10"
          aria-label="Back to buddies"
        >
          <ChevronLeft className="h-6 w-6" />
        </Link>
      </div>

      {loading && (
        <p className="flex flex-1 items-center justify-center text-sm text-slate-500">Loading profile…</p>
      )}

      {error && (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          <Link
            href="/friends"
            className="mt-4 text-sm font-semibold text-prove-600 hover:underline dark:text-prove-400"
          >
            Back to buddies
          </Link>
        </div>
      )}

      {profile && (
        <div className="flex min-h-0 flex-1 flex-col pb-[max(1rem,env(safe-area-inset-bottom))]">
          <BuddyProfileHero profile={profile} fullScreen />
        </div>
      )}
    </main>
  );
}
