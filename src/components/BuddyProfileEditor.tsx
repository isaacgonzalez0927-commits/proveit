"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Link2, Share2, Users } from "lucide-react";
import clsx from "clsx";
import { useApp } from "@/context/AppContext";
import { PlantIllustration } from "@/components/PlantIllustration";
import {
  buddyProfileBackgroundStyle,
  type BuddyProfileSettings,
  type BuddyProfileVisibility,
} from "@/lib/buddyProfile";
import { getPlantVariantsForPlan } from "@/lib/goalPlants";
import {
  ACCENT_THEME_OPTIONS,
  canUseAccentTheme,
  getStoredAccentTheme,
  type AccentTheme,
} from "@/lib/theme";
import { normalizePlanId } from "@/types";

export function BuddyProfileEditor() {
  const { user } = useApp();
  const plan = normalizePlanId(user?.plan);
  const plantOptions = getPlantVariantsForPlan(plan);

  const [settings, setSettings] = useState<BuddyProfileSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/buddy-profile", { credentials: "same-origin" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not load profile.");
      }
      setSettings(data.settings as BuddyProfileSettings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (patch: Record<string, unknown>) => {
    setSaving(true);
    setMessage(null);
    setError(null);
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
      setMessage("Saved!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const shareFriendLink = async () => {
    if (!settings?.friendLinkUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Add me on Proveit",
          text: "Connect with me on Proveit so we can cheer each other on.",
          url: settings.friendLinkUrl,
        });
        setMessage("Link shared!");
        return;
      }
      await navigator.clipboard.writeText(settings.friendLinkUrl);
      setMessage("Friend link copied!");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setMessage("Could not share link.");
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Loading buddy profile…</p>;
  }

  if (error && !settings) {
    return <p className="text-sm text-red-700 dark:text-red-300">{error}</p>;
  }

  if (!settings) return null;

  const previewBg = buddyProfileBackgroundStyle(settings.accentTheme);

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-700/60">
        <div className="relative px-4 py-6" style={previewBg}>
          <p className="text-center text-xs font-semibold uppercase tracking-wide text-slate-800/80 dark:text-white/80">
            Preview
          </p>
          <div className="mx-auto mt-3 flex h-20 w-20 items-center justify-center rounded-full bg-white/90 shadow-md dark:bg-slate-900/90">
            <PlantIllustration
              stage="thriving"
              wateringLevel={1}
              wateredGoals={1}
              variant={settings.avatarPlant}
              className="h-16 w-16"
              size="small"
            />
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Profile plant</p>
        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
          Buddies see this instead of a photo. Unlocked plants match your plan.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {plantOptions.map((variant) => (
            <button
              key={variant}
              type="button"
              disabled={saving}
              onClick={() => void save({ avatarPlant: variant })}
              className={clsx(
                "rounded-xl border p-1.5 transition",
                settings.avatarPlant === variant
                  ? "border-prove-500 bg-prove-50 ring-1 ring-prove-500/30 dark:border-prove-400 dark:bg-prove-950/50"
                  : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-600 dark:bg-slate-900"
              )}
              aria-label={`Plant style ${variant}`}
            >
              <div className="flex h-11 w-11 items-center justify-center">
                <PlantIllustration
                  stage="leafy"
                  wateringLevel={0.5}
                  wateredGoals={0}
                  variant={variant}
                  size="small"
                />
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Profile background</p>
        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
          Uses your accent theme colors — only buddies can see this.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {ACCENT_THEME_OPTIONS.filter((o) => canUseAccentTheme(plan, o.id)).map((option) => (
            <button
              key={option.id}
              type="button"
              disabled={saving}
              onClick={() => void save({ accentTheme: option.id })}
              className={clsx(
                "flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition",
                settings.accentTheme === option.id
                  ? "border-prove-500 bg-prove-50 text-prove-900 dark:border-prove-400 dark:bg-prove-950/50 dark:text-prove-100"
                  : "border-slate-200 text-slate-700 dark:border-slate-600 dark:text-slate-300"
              )}
            >
              <span className={`h-4 w-4 rounded-full ${option.swatchClassName}`} />
              {option.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => {
            const accent = getStoredAccentTheme();
            void save({ accentTheme: accent });
          }}
          className="mt-2 text-xs font-semibold text-prove-700 hover:underline dark:text-prove-300"
        >
          Use my current app theme
        </button>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Who can see your profile</p>
        <div className="mt-2 space-y-2">
          <VisibilityOption
            selected={settings.visibility === "shared_goals_only"}
            disabled={saving}
            title="Buddy goals only"
            description="Only people on a shared buddy goal with you."
            onSelect={() => void save({ visibility: "shared_goals_only" satisfies BuddyProfileVisibility })}
          />
          <VisibilityOption
            selected={settings.visibility === "friend_link"}
            disabled={saving}
            title="Friend link + buddy goals"
            description="Share a link in messages so friends can connect and see your profile."
            onSelect={() => void save({ visibility: "friend_link" satisfies BuddyProfileVisibility })}
          />
        </div>
      </div>

      {settings.visibility === "friend_link" && settings.friendLinkUrl && (
        <div className="rounded-xl border border-dashed border-prove-300/80 bg-prove-50/50 p-3 dark:border-prove-700/60 dark:bg-prove-950/30">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-prove-800 dark:text-prove-200">
            <Link2 className="h-3.5 w-3.5" />
            Your friend link
          </p>
          <p className="mt-2 break-all font-mono text-[11px] text-slate-600 dark:text-slate-400">
            {settings.friendLinkUrl}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void shareFriendLink()}
              className="inline-flex items-center gap-1 rounded-lg bg-prove-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-prove-700 btn-glass-primary"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </button>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(settings.friendLinkUrl ?? "");
                setMessage("Link copied!");
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </button>
          </div>
        </div>
      )}

      {(message || error) && (
        <p
          className={clsx(
            "text-xs font-medium",
            error ? "text-red-700 dark:text-red-300" : "text-emerald-700 dark:text-emerald-300"
          )}
        >
          {error ?? message}
        </p>
      )}
    </div>
  );
}

function VisibilityOption({
  selected,
  disabled,
  title,
  description,
  onSelect,
}: {
  selected: boolean;
  disabled?: boolean;
  title: string;
  description: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={clsx(
        "w-full rounded-xl border p-3 text-left transition",
        selected
          ? "border-prove-400 bg-prove-50/80 ring-1 ring-prove-500/20 dark:border-prove-600 dark:bg-prove-950/40"
          : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950"
      )}
    >
      <div className="flex items-start gap-2">
        <Users className="mt-0.5 h-4 w-4 shrink-0 text-prove-600 dark:text-prove-400" />
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
    </button>
  );
}
