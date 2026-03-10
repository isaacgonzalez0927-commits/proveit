"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, Trash2, Lock } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { hasCreatorAccess } from "@/lib/accountAccess";
import {
  getStoredDeveloperModeSettings,
  saveDeveloperModeSettings,
} from "@/lib/developerMode";
import {
  DEFAULT_HISTORY_DISPLAY_SETTINGS,
  getStoredHistoryDisplaySettings,
  saveHistoryDisplaySettings,
  type HistoryDisplaySettings,
} from "@/lib/historySettings";
import {
  getStoredHiddenHistoryGoalIds,
  hideGoalFromHistory,
  saveHiddenHistoryGoalIds,
  showGoalInHistory,
} from "@/lib/historyVisibility";
import {
  ACCENT_THEME_OPTIONS,
  canUseAccentTheme,
  getStoredAccentTheme,
  saveAndApplyAccentTheme,
  sanitizeAccentThemeForPlan,
  type AccentTheme,
} from "@/lib/theme";
import { UpgradePromptModal } from "@/components/UpgradePromptModal";

const HISTORY_SETTING_ITEMS: Array<{
  key: keyof HistoryDisplaySettings;
  label: string;
  description: string;
}> = [
  {
    key: "showProofPhotos",
    label: "Show proof photos",
    description: "Display image thumbnails in goal gallery when a submission has a photo.",
  },
  {
    key: "showStreak",
    label: "Show streak details",
    description: "Show current streak for each goal inside gallery cards.",
  },
  {
    key: "showVerifiedCount",
    label: "Show verified count",
    description: "Show total verified entries for each goal.",
  },
  {
    key: "showThisWeekBadge",
    label: "Show \"This week\" badge",
    description: "Highlight entries that happened in the current week.",
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const { user, goals, submissions, signOut, useSupabase, supabase, clearPlanSelectionForNewUser, restoreActualAccount } = useApp();
  const [historySettings, setHistorySettings] = useState<HistoryDisplaySettings>(
    DEFAULT_HISTORY_DISPLAY_SETTINGS
  );
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [hidingGoalId, setHidingGoalId] = useState<string | null>(null);
  const [hiddenGoalIds, setHiddenGoalIds] = useState<string[]>([]);
  const [developerEnabled, setDeveloperEnabled] = useState(false);
  const [accentTheme, setAccentTheme] = useState<AccentTheme>("green");
  const [upgradePromptOpen, setUpgradePromptOpen] = useState(false);
  const [upgradePromptPlan, setUpgradePromptPlan] = useState<"pro" | "premium">("pro");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [confirmEmailLoading, setConfirmEmailLoading] = useState(false);
  const [confirmEmailMessage, setConfirmEmailMessage] = useState<string | null>(null);
  const isCreatorAccount = hasCreatorAccess(user?.email);

  useEffect(() => {
    setHistorySettings(getStoredHistoryDisplaySettings());
    setHiddenGoalIds(getStoredHiddenHistoryGoalIds());
    setDeveloperEnabled(getStoredDeveloperModeSettings().enabled);
    setAccentTheme(getStoredAccentTheme());
  }, []);

  useEffect(() => {
    const sanitized = sanitizeAccentThemeForPlan(getStoredAccentTheme(), user?.plan);
    setAccentTheme(sanitized);
    saveAndApplyAccentTheme(sanitized);
  }, [user?.plan]);

  const goalHistoryEntries = useMemo(
    () =>
      goals
        .map((goal) => {
          const totalEntries = submissions.filter((submission) => submission.goalId === goal.id).length;
          const verifiedEntries = submissions.filter(
            (submission) => submission.goalId === goal.id && submission.status === "verified"
          ).length;
          return {
            goal,
            totalEntries,
            verifiedEntries,
            hidden: hiddenGoalIds.includes(goal.id),
          };
        })
        .filter((entry) => entry.totalEntries > 0),
    [goals, submissions, hiddenGoalIds]
  );
  const visibleGoalHistoryEntries = goalHistoryEntries.filter((entry) => !entry.hidden);
  const hiddenGoalHistoryEntries = goalHistoryEntries.filter((entry) => entry.hidden);

  const updateHistorySetting = (key: keyof HistoryDisplaySettings, checked: boolean) => {
    const next = { ...historySettings, [key]: checked };
    setHistorySettings(next);
    saveHistoryDisplaySettings(next);
    setSettingsMessage("Gallery settings saved.");
  };

  const updateAccentTheme = (nextAccent: AccentTheme) => {
    if (!canUseAccentTheme(user?.plan, nextAccent)) {
      const option = ACCENT_THEME_OPTIONS.find((o) => o.id === nextAccent);
      setUpgradePromptPlan(option?.premiumOnly ? "premium" : "pro");
      setUpgradePromptOpen(true);
      return;
    }
    const label = ACCENT_THEME_OPTIONS.find((option) => option.id === nextAccent)?.label ?? "Theme";
    setAccentTheme(nextAccent);
    saveAndApplyAccentTheme(nextAccent);
    setSettingsMessage(`${label} theme enabled.`);
  };

  const handleToggleDeveloperTools = (enabled: boolean) => {
    const next = { ...getStoredDeveloperModeSettings(), enabled };
    saveDeveloperModeSettings(next);
    setDeveloperEnabled(enabled);
    setSettingsMessage(enabled ? "Developer tools enabled." : "Developer tools disabled.");
  };

  const handleHideGoalHistory = async (goalId: string, goalTitle: string) => {
    setSettingsMessage(null);
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        `Hide "${goalTitle}" from Goal Gallery? You can restore it below any time.`
      );
      if (!confirmed) return;
    }
    setHidingGoalId(goalId);
    const nextHiddenGoalIds = hideGoalFromHistory(goalId, hiddenGoalIds);
    setHiddenGoalIds(nextHiddenGoalIds);
    saveHiddenHistoryGoalIds(nextHiddenGoalIds);
    setSettingsMessage(`Hidden "${goalTitle}" from gallery.`);
    setHidingGoalId(null);
  };

  const handleShowGoalHistory = (goalId: string, goalTitle: string) => {
    const nextHiddenGoalIds = showGoalInHistory(goalId, hiddenGoalIds);
    setHiddenGoalIds(nextHiddenGoalIds);
    saveHiddenHistoryGoalIds(nextHiddenGoalIds);
    setSettingsMessage(`Restored "${goalTitle}" in gallery.`);
  };

  const handleDeleteAccount = async () => {
    if (deletingAccount) return;

    if (typeof window !== "undefined") {
      const firstConfirm = window.confirm(
        "Delete your account permanently? This removes your profile, goals, and proof gallery data."
      );
      if (!firstConfirm) return;
      const secondConfirm = window.confirm(
        "This action cannot be undone. Are you absolutely sure?"
      );
      if (!secondConfirm) return;
    }

    setDeletingAccount(true);
    setSettingsMessage(null);

    try {
      if (useSupabase) {
        const res = await fetch("/api/account", { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const message =
            typeof data?.error === "string" && data.error
              ? data.error
              : "Could not delete account right now.";
          setSettingsMessage(message);
          return;
        }
      }

      await Promise.resolve(signOut());
      router.replace("/");
    } catch {
      setSettingsMessage("Could not delete account right now.");
    } finally {
      setDeletingAccount(false);
    }
  };

  if (!user) {
    return (
      <>
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 pb-[max(6.5rem,env(safe-area-inset-bottom))] text-center">
          <p className="text-slate-600 dark:text-slate-400">Please sign in from the dashboard.</p>
          <Link href="/dashboard" className="mt-4 inline-block text-prove-600 hover:underline">
            Go to Dashboard
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 pb-[max(6.5rem,env(safe-area-inset-bottom))]">
        <header className="mb-8">
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Settings
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Themes, gallery display, and account.
          </p>
        </header>
        <section className="rounded-2xl p-5 glass-card">
          <h2 className="font-semibold text-slate-900 dark:text-white">Theme colors</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Green is free. Pro: 6 theme colors. Premium: all 10 theme colors.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {ACCENT_THEME_OPTIONS.map((option) => {
              const selected = accentTheme === option.id;
              const locked = !canUseAccentTheme(user?.plan, option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => updateAccentTheme(option.id)}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
                    selected
                      ? "border-prove-500 bg-prove-50 text-prove-800 dark:border-prove-500 dark:bg-prove-950/40 dark:text-prove-300"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  }`}
                  aria-label={`Set ${option.label} theme`}
                >
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="h-4 w-4 shrink-0 rounded-full border border-slate-300 dark:border-slate-600"
                      style={{ backgroundColor: option.swatchColor }}
                    />
                    {option.label}
                  </span>
                  {locked ? (
                    <Lock className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  ) : selected ? (
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">Active</span>
                  ) : null}
                </button>
              );
            })}
          </div>
          {user?.plan === "free" && (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Upgrade to Pro for 6 themes, or Premium for all 10.
            </p>
          )}
        </section>

        <section className="mt-6 rounded-2xl p-5 glass-card">
          <h2 className="font-semibold text-slate-900 dark:text-white">Gallery display</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            These options control what is shown on the Goal Gallery page.
          </p>
          <div className="mt-4 space-y-2">
            {HISTORY_SETTING_ITEMS.map((item) => (
              <label
                key={item.key}
                className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{item.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.description}</p>
                </div>
                <input
                  type="checkbox"
                  checked={historySettings[item.key]}
                  onChange={(event) => updateHistorySetting(item.key, event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-prove-600 focus:ring-prove-500 dark:border-slate-600"
                />
              </label>
            ))}
          </div>
        </section>

        {useSupabase && user?.email && (
          <section className="mt-6 rounded-2xl p-5 glass-card">
            <h2 className="font-semibold text-slate-900 dark:text-white">Confirm email</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Confirming your email secures your account and lets you reset your password if you forget it. Resend the confirmation link below — it’s sent via Resend (same as password reset).
            </p>
            <div className="mt-4">
              <button
                type="button"
                onClick={async () => {
                  if (!user?.email) return;
                  setConfirmEmailMessage(null);
                  setConfirmEmailLoading(true);
                  try {
                    const origin = typeof window !== "undefined" ? window.location.origin : "";
                    const res = await fetch("/api/auth/resend-confirm", {
                      method: "POST",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ origin }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (res.ok) {
                      setConfirmEmailMessage(data.message ?? "Check your inbox and spam folder.");
                      return;
                    }
                    if (res.status === 501) {
                      setConfirmEmailMessage("One-time setup: Supabase Dashboard → your project → Settings → API → copy the service_role key (click Reveal). In this project add to .env.local: SUPABASE_SERVICE_ROLE_KEY=paste_key_here then restart the app (Ctrl+C, npm run dev). On Vercel add the same variable in Project → Settings → Environment Variables.");
                      return;
                    }
                    setConfirmEmailMessage(data.error ?? (res.status === 401 ? "Please sign in again." : "Something went wrong. Try again later."));
                  } catch (e) {
                    setConfirmEmailMessage(e instanceof Error ? e.message : "Something went wrong. Try again later.");
                  } finally {
                    setConfirmEmailLoading(false);
                  }
                }}
                disabled={confirmEmailLoading}
                className="rounded-lg bg-prove-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-prove-700 disabled:opacity-70 btn-glass-primary"
              >
                {confirmEmailLoading ? "Sending…" : "Resend confirmation email"}
              </button>
              {confirmEmailMessage != null && (
                <p className="mt-1.5">
                  <Link
                    href="/settings/change-email"
                    className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    Email not sent? Change email
                  </Link>
                </p>
              )}
            </div>
            {confirmEmailMessage && (
              <p className={`mt-3 text-sm ${confirmEmailMessage.startsWith("Check") ? "text-prove-700 dark:text-prove-300" : "text-amber-700 dark:text-amber-300"}`} role="status">
                {confirmEmailMessage}
              </p>
            )}
          </section>
        )}

        {isCreatorAccount && (
          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/55 p-5 dark:border-amber-900/60 dark:bg-amber-950/25">
            <h2 className="font-semibold text-amber-900 dark:text-amber-200">Developer tools (private)</h2>
            <p className="mt-1 text-xs text-amber-800/90 dark:text-amber-300/90">
              Only visible for creator accounts. Toggle developer tools here.
            </p>
            <label className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/35 dark:text-amber-200">
              <input
                type="checkbox"
                checked={developerEnabled}
                onChange={(event) => handleToggleDeveloperTools(event.target.checked)}
                className="h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
              />
              {developerEnabled ? "Developer tools ON" : "Developer tools OFF"}
            </label>
            {developerEnabled && (
              <div className="mt-3 space-y-3">
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      clearPlanSelectionForNewUser();
                      router.push("/");
                    }}
                    className="rounded-lg border border-amber-400 bg-white px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-50 dark:border-amber-600 dark:bg-amber-950/35 dark:text-amber-200 dark:hover:bg-amber-900/30"
                  >
                    Treat as new user
                  </button>
                  <p className="mt-1.5 text-xs text-amber-800/90 dark:text-amber-300/90">
                    Shows the app as a new guest (empty goals, plan picker). Use the button below to restore your real account.
                  </p>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={restoreActualAccount}
                    className="rounded-lg border border-emerald-500 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100 dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-900/50"
                  >
                    Go back to my actual account
                  </button>
                  <p className="mt-1.5 text-xs text-amber-800/90 dark:text-amber-300/90">
                    Leave guest mode and reload with your real goals and data.
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

        <section className="mt-6 rounded-2xl border border-red-200 bg-red-50/50 p-5 dark:border-red-900/60 dark:bg-red-950/20">
          <h2 className="font-semibold text-red-800 dark:text-red-200">Hide goals from gallery</h2>
          <p className="mt-1 text-xs text-red-700/90 dark:text-red-300/90">
            Hiding removes the goal from Gallery view only. It does not delete proof data.
          </p>
          {visibleGoalHistoryEntries.length === 0 ? (
            <p className="mt-3 text-sm text-red-700/90 dark:text-red-300/90">
              No visible goal gallery right now.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {visibleGoalHistoryEntries.map((entry) => (
                <div
                  key={entry.goal.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-white px-3 py-2.5 dark:border-red-900/60 dark:bg-slate-900/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                      {entry.goal.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {entry.totalEntries} entries · {entry.verifiedEntries} verified
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleHideGoalHistory(entry.goal.id, entry.goal.title)}
                    disabled={hidingGoalId === entry.goal.id}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-red-300 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-70 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {hidingGoalId === entry.goal.id ? "Hiding..." : "Hide from gallery"}
                  </button>
                </div>
              ))}
            </div>
          )}
          {hiddenGoalHistoryEntries.length > 0 && (
            <div className="mt-4 rounded-lg border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/70">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">
                Hidden goals
              </p>
              <div className="mt-2 space-y-2">
                {hiddenGoalHistoryEntries.map((entry) => (
                  <div key={entry.goal.id} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-sm text-slate-700 dark:text-slate-300">
                      {entry.goal.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleShowGoalHistory(entry.goal.id, entry.goal.title)}
                      className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Show again
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-2xl p-5 glass-card">
          <h2 className="font-semibold text-slate-900 dark:text-white">Legal & support</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Review legal policies and contact support.
          </p>
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <Link href="/privacy" className="text-prove-600 hover:underline dark:text-prove-400">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-prove-600 hover:underline dark:text-prove-400">
              Terms of Use
            </Link>
            <a
              href="mailto:contact.proveit.app@gmail.com"
              className="text-prove-600 hover:underline dark:text-prove-400"
            >
              Contact support
            </a>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-red-300 bg-red-50 p-5 dark:border-red-900/70 dark:bg-red-950/25">
          <h2 className="font-semibold text-red-800 dark:text-red-200">Delete account</h2>
          <p className="mt-1 text-xs text-red-700/90 dark:text-red-300/90">
            Permanently delete your account and all associated data.
          </p>
          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={deletingAccount}
            className="mt-3 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {deletingAccount ? "Deleting account..." : "Delete my account"}
          </button>
        </section>

        {settingsMessage && (
          <p className="mt-4 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            {settingsMessage}
          </p>
        )}

        <Link
          href="/dashboard"
          className="mt-8 block text-center text-sm text-prove-600 hover:underline dark:text-prove-400"
        >
          ← Back to dashboard
        </Link>
      </main>
      <UpgradePromptModal
        open={upgradePromptOpen}
        onClose={() => setUpgradePromptOpen(false)}
        requiredPlan={upgradePromptPlan}
      />
    </>
  );
}
