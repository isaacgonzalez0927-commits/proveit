"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
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
    <Link
      href={`/profile/${user.id}`}
      className="relative block overflow-hidden rounded-2xl glass-card transition hover:ring-1 hover:ring-prove-400/30"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={buddyProfileBackgroundStyle(accent)}
        aria-hidden
      />
      <div
        className="relative flex items-center gap-3 border-l-[3px] p-4"
        style={buddyProfileAccentBorderStyle(accent)}
      >
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
            View & edit your buddy profile
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
      </div>
    </Link>
  );
}
