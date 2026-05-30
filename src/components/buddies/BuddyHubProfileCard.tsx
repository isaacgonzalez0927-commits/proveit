"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Settings2 } from "lucide-react";
import { BuddyProfileAvatar } from "@/components/BuddyProfileAvatar";
import type { BuddyProfileSettings } from "@/lib/buddyProfile";
import { useApp } from "@/context/AppContext";
import { accountDisplayLabel } from "@/lib/usernameAuth";

export function BuddyHubProfileCard() {
  const { user } = useApp();
  const [settings, setSettings] = useState<BuddyProfileSettings | null>(null);

  useEffect(() => {
    if (!user) return;
    void fetch("/api/buddy-profile", { credentials: "same-origin" })
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) setSettings(data.settings as BuddyProfileSettings);
      })
      .catch(() => undefined);
  }, [user]);

  if (!user?.id) return null;

  const displayName = accountDisplayLabel(user);
  const plant = settings?.avatarPlant ?? 1;
  const accent = settings?.accentTheme ?? "green";

  return (
    <div className="flex items-center gap-4 overflow-hidden rounded-2xl glass-card p-4">
      <Link href={`/profile/${user.id}`} className="flex min-w-0 flex-1 items-center gap-4">
        <BuddyProfileAvatar
          variant={plant}
          accentTheme={accent}
          size="md"
          ringClassName="ring-2 ring-white/80 dark:ring-slate-900/80"
        />
        <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Your buddy profile
        </p>
        <p className="truncate font-display text-lg font-bold text-slate-900 dark:text-white">{displayName}</p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Buddies on shared goals can see your plant & stats
        </p>
        </div>
      </Link>
      <Link
        href="/settings"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        aria-label="Edit buddy profile in settings"
      >
        <Settings2 className="h-4 w-4" />
      </Link>
    </div>
  );
}
