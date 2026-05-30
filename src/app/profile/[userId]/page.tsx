"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BuddyProfileHero } from "@/components/BuddyProfileHero";
import type { BuddyProfilePublic } from "@/lib/buddyProfile";

export default function BuddyProfilePage() {
  const params = useParams();
  const userId = typeof params.userId === "string" ? params.userId : "";
  const [profile, setProfile] = useState<BuddyProfilePublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <main className="mx-auto max-w-lg px-4 pb-28 pt-6">
      {loading && <p className="text-center text-sm text-slate-500">Loading profile…</p>}

      {error && (
        <div className="rounded-2xl p-5 text-center glass-card">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          <Link
            href="/friends"
            className="mt-4 inline-block text-sm font-semibold text-prove-600 hover:underline dark:text-prove-400"
          >
            Back to buddy goals
          </Link>
        </div>
      )}

      {profile && <BuddyProfileHero profile={profile} />}

      <Link
        href="/friends"
        className="mt-8 block text-center text-sm font-medium text-prove-600 hover:underline dark:text-prove-400"
      >
        ← Buddies
      </Link>
    </main>
  );
}
