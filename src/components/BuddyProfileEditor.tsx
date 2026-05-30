"use client";

import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { useApp } from "@/context/AppContext";
import { BuddyProfileAvatar } from "@/components/BuddyProfileAvatar";
import { buddyProfileBackgroundStyle, type BuddyProfileSettings } from "@/lib/buddyProfile";
import { getPlantVariantsForPlan } from "@/lib/goalPlants";
import { getStoredAccentTheme } from "@/lib/theme";
import { normalizePlanId } from "@/types";

interface BuddyProfileEditorProps {
  /** Inline on profile page — hides duplicate preview and preview link. */
  embedded?: boolean;
  onSettingsSaved?: (settings: BuddyProfileSettings) => void;
}

export function BuddyProfileEditor({ embedded = false, onSettingsSaved }: BuddyProfileEditorProps) {
  const { user } = useApp();
  const plan = normalizePlanId(user?.plan);
  const plantOptions = getPlantVariantsForPlan(plan);

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
      const next = data.settings as BuddyProfileSettings;
      setSettings(next);
      onSettingsSaved?.(next);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

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

  const previewGlow = buddyProfileBackgroundStyle(settings.accentTheme);

  const plantPicker = (
    <>
      <p className="text-sm font-semibold text-slate-900 dark:text-white">Profile plant</p>
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
                "rounded-full transition active:scale-95",
                selected
                  ? "ring-2 ring-prove-500 ring-offset-2 ring-offset-[var(--bg-app)]"
                  : "opacity-75 hover:opacity-100"
              )}
              aria-label={`Plant ${variant}`}
              aria-pressed={selected}
            >
              <BuddyProfileAvatar
                variant={variant}
                accentTheme={settings.accentTheme}
                size="sm"
                ringClassName="ring-2 ring-white/80 dark:ring-slate-800/80"
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
    </>
  );

  if (embedded) {
    return (
      <div className="overflow-hidden rounded-2xl glass-card px-4 py-4">
        {plantPicker}
        <p className="mt-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Profile glow follows your theme in{" "}
          <span className="font-medium text-slate-700 dark:text-slate-300">Settings → Appearance</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl glass-card">
      <div className="relative px-4 pb-5 pt-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-36" style={previewGlow} aria-hidden />
        <div className="relative flex flex-col items-center">
          <BuddyProfileAvatar
            variant={settings.avatarPlant}
            accentTheme={settings.accentTheme}
            size="lg"
          />
          <p className="mt-4 max-w-[28ch] text-center text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            Buddies on a <span className="font-semibold text-slate-800 dark:text-slate-200">shared goal</span>{" "}
            see this plant and your stats.
          </p>
        </div>
      </div>

      <div className="border-t border-slate-200/70 px-4 py-4 dark:border-slate-700/60">{plantPicker}</div>

      <div className="border-t border-slate-200/70 px-4 py-4 dark:border-slate-700/60">
        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Header glow follows your theme in{" "}
          <span className="font-medium text-slate-700 dark:text-slate-300">Appearance</span> below.
        </p>
      </div>
    </div>
  );
}
