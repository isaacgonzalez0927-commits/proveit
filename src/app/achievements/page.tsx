"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Achievements live on the Buddies hub. */
export default function AchievementsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/friends#achievements");
  }, [router]);

  return (
    <main className="mx-auto max-w-lg px-4 py-12 text-center">
      <p className="text-sm text-slate-500">Opening buddies…</p>
    </main>
  );
}
