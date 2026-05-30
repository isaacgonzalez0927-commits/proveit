"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { useApp } from "@/context/AppContext";
import { BuddyProfileAvatar } from "@/components/BuddyProfileAvatar";
import { buddyProfileBackgroundStyle, type BuddyProfileSettings } from "@/lib/buddyProfile";
import { getPlantVariantsForPlan } from "@/lib/goalPlants";
import { getStoredAccentTheme } from "@/lib/theme";
import { normalizePlanId } from "@/types";

export function BuddyProfileEditor() {
  const { user } = useApp();
  const plan = normalizePlanId(user?.plan);
  const plantOptions = getPlantVariantsForPlan(plan);
  const profileHref = user?.id ? `/profile/${user.id}` : "/friends";

  const [settings, setSettings] = useState<BuddyProfileSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    try {
      const res = await fetch("/api/buddy-profile", { credentials: "same-origin" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not load profile.");
      }
      setSettings(data.settings as BuddyProfileSettings);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not load profile.");
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (patch: Record<string, unknown>) => {
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch("/api/buddy-profile", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not save.");
      }
      setSettings(data.settings as BuddyProfileSettings);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  // Keep profile header color in sync with the app theme (Appearance section).
  useEffect(() => {
    if (!settings || saving) return;
    const appAccent = getStoredAccentTheme();
    if (settings.accentTheme !== appAccent) {
      void save({ accentTheme: appAccent });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when settings load only
  }, [settings?.accentTheme, loading]);

  if (loading) {
    return (
      <p className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Loading…
      </p>
    );
  }

  if (!settings) {
    return (
      <p className="px-4 py-6 text-center text-sm text-red-700 dark:text-red-300">
        {notice ?? "Could not load buddy profile."}
      </p>
    );
  }

  const previewBg = buddyProfileBackgroundStyle(settings.accentTheme);

  return (
    <div className="space-y-0">
      <div className="relative overflow-hidden px-4 pb-5 pt-6" style={previewBg}>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/15 to-transparent dark:from-black/15" />
        <div className="relative flex flex-col items-center">
          <BuddyProfileAvatar
            variant={settings.avatarPlant}
            accentTheme={settings.accentTheme}
            size="lg"
          />
          <p className="mt-3 text-center text-xs text-slate-800/90 dark:text-white/90">
            Only buddies on a <span className="font-semibold">shared goal</span> see this.
          </p>
        </div>
      </div>

      <div className="border-t border-slate-200/80 px-4 py-4 dark:border-slate-700/60">
        <p className="text-sm font-medium text-slate-900 dark:text-white">Profile plant</p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Fully grown — unlocked by your plan.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {plantOptions.map((variant) => {
            const selected = settings.avatarPlant === variant;
            return (
              <button
                key={variant}
                type="button"
                disabled={saving}
                onClick={() => void save({ avatarPlant: variant })}
                className={clsx(
                  "rounded-full transition",
                  selected
                    ? "ring-2 ring-prove-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900"
                    : "opacity-80 hover:opacity-100"
                )}
                aria-label={`Plant ${variant}`}
                aria-pressed={selected}
              >
                <BuddyProfileAvatar
                  variant={variant}
                  accentTheme={settings.accentTheme}
                  size="sm"
                  ringClassName="ring-2 ring-white/70 dark:ring-slate-900/70"
                />
              </button>
            );
          })}
        </div>
        {saving && (
          <p className="mt-3 text-center text-xs text-slate-500" role="status">
            Saving…
          </p>
        )}
        {notice && !saving && (
          <p
            className={clsx(
              "mt-3 text-center text-xs font-medium",
              /could not|error/i.test(notice)
                ? "text-red-700 dark:text-red-300"
                : "text-emerald-700 dark:text-emerald-300"
            )}
          >
            {notice}
          </p>
        )}
      </div>

      <div className="border-t border-slate-200/80 px-4 py-3 dark:border-slate-700/60">
        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Header color follows your theme in{" "}
          <span className="font-medium text-slate-700 dark:text-slate-300">Appearance</span> below.
        </p>
        <Link
          href={profileHref}
          className="mt-3 flex w-full items-center justify-center rounded-xl border border-prove-200/90 bg-prove-50/80 py-2.5 text-sm font-semibold text-prove-800 transition hover:bg-prove-100 dark:border-prove-800/60 dark:bg-prove-950/40 dark:text-prove-200 dark:hover:bg-prove-950/60"
        >
          Preview buddy profile
        </Link>
      </div>
    </div>
  );
}
