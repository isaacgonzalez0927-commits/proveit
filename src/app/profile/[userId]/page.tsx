"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { BuddyProfileEditor } from "@/components/BuddyProfileEditor";
import { BuddyProfileHero } from "@/components/BuddyProfileHero";
import { buddyProfileBackgroundStyle, type BuddyProfilePublic, type BuddyProfileSettings } from "@/lib/buddyProfile";
import { useHideHeader } from "@/context/HideHeaderContext";

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

  const handleSettingsSaved = useCallback((settings: BuddyProfileSettings) => {
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            avatarPlant: settings.avatarPlant,
            accentTheme: settings.accentTheme,
          }
        : prev
    );
  }, []);

  const pageGlow = profile ? buddyProfileBackgroundStyle(profile.accentTheme) : undefined;

  return (
    <main className="relative min-h-[100dvh] bg-[var(--bg-app)] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      {pageGlow && (
        <div
          className="pointer-events-none fixed inset-x-0 top-0 h-56"
          style={pageGlow}
          aria-hidden
        />
      )}

      <div className="relative z-10 flex items-center gap-2 px-4 pb-1 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <Link
          href="/friends"
          className="flex h-10 w-10 items-center justify-center rounded-full glass-card text-slate-800 active:scale-95 dark:text-white"
          aria-label="Back to buddies"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
      </div>

      {loading && (
        <p className="px-6 py-16 text-center text-sm text-slate-500">Loading profile…</p>
      )}

      {error && (
        <div className="mx-auto max-w-lg px-6 py-16 text-center">
          <p className="rounded-2xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
          <Link
            href="/friends"
            className="mt-4 inline-block text-sm font-semibold text-prove-600 hover:underline dark:text-prove-400"
          >
            Back to buddies
          </Link>
        </div>
      )}

      {profile && (
        <div className="relative z-10 space-y-4 pt-2">
          <BuddyProfileHero profile={profile} fullScreen />
          {profile.isYou && (
            <div className="mx-auto w-full max-w-lg px-4">
              <BuddyProfileEditor embedded onSettingsSaved={handleSettingsSaved} />
            </div>
          )}
        </div>
      )}
    </main>
  );
}
