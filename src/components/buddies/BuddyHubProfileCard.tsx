"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Settings2 } from "lucide-react";
import { BuddyProfileAvatar } from "@/components/BuddyProfileAvatar";
import {
  buddyProfileAccentBorderStyle,
  buddyProfileBackgroundStyle,
  type BuddyProfileSettings,
} from "@/lib/buddyProfile";
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
    <div className="relative overflow-hidden rounded-2xl glass-card">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={buddyProfileBackgroundStyle(accent)}
        aria-hidden
      />
      <div className="relative flex items-center gap-3 border-l-[3px] p-4" style={buddyProfileAccentBorderStyle(accent)}>
        <Link href={`/profile/${user.id}`} className="flex min-w-0 flex-1 items-center gap-3">
          <BuddyProfileAvatar
            variant={plant}
            accentTheme={accent}
            size="md"
            ringClassName="ring-2 ring-white/90 dark:ring-slate-800/90"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-bold text-slate-900 dark:text-white">
              {displayName}
            </p>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
              View your buddy profile
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
        </Link>
        <Link
          href="/settings"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white/60 text-slate-600 transition hover:bg-white dark:border-slate-600/60 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="Edit buddy profile in settings"
        >
          <Settings2 className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
