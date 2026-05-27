"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Info,
  Lock,
  Mail,
  Palette,
  Search,
  Shield,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { normalizePlanId } from "@/types";
import { isInternalAuthEmail } from "@/lib/usernameAuth";
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

function SettingsDisclosure({
  title,
  description,
  icon,
  children,
  danger = false,
}: {
  title: string;
  description?: string;
  icon: ReactNode;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <details className={`motion-disclosure group overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/75 dark:bg-slate-900 dark:ring-white/10 ${danger ? "bg-red-50/80 ring-red-200 dark:bg-red-950/20 dark:ring-red-900/50" : ""}`}>
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 marker:hidden">
        <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${danger ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" : "bg-prove-100 text-prove-700 dark:bg-prove-950 dark:text-prove-300"}`}>
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block text-[15px] font-semibold ${danger ? "text-red-800 dark:text-red-200" : "text-slate-950 dark:text-white"}`}>
            {title}
          </span>
          {description && (
            <span className={`mt-0.5 block text-xs ${danger ? "text-red-700/90 dark:text-red-300/90" : "text-slate-500 dark:text-slate-400"}`}>
              {description}
            </span>
          )}
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 transition-transform group-open:rotate-90" />
      </summary>
      <div className="motion-disclosure-panel border-t border-slate-100 dark:border-white/10">
        <div className="motion-disclosure-inner">
          {children}
        </div>
      </div>
    </details>
  );
}

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
  const { user, goals, submissions, signOut, useSupabase, supabase, clearPlanSelectionForNewUser, restoreActualAccount, setUser } = useApp();
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
  const [contactDraft, setContactDraft] = useState("");
  const [contactSaving, setContactSaving] = useState(false);
  const [strictAiEnabled, setStrictAiEnabled] = useState(false);
  const [settingsQuery, setSettingsQuery] = useState("");
  const isCreatorAccount = hasCreatorAccess(user?.email, user?.contactEmail);

  useEffect(() => {
    setHistorySettings(getStoredHistoryDisplaySettings());
    setHiddenGoalIds(getStoredHiddenHistoryGoalIds());
    setDeveloperEnabled(getStoredDeveloperModeSettings().enabled);
    setAccentTheme(getStoredAccentTheme());
  }, []);

  useEffect(() => {
    setContactDraft(user?.contactEmail ?? "");
    setStrictAiEnabled(user?.strictAiVerification === true);
  }, [user?.contactEmail, user?.strictAiVerification]);

  const handleStrictAiToggle = async (checked: boolean) => {
    if (!user || (user.plan !== "pro" && user.plan !== "premium")) {
      setUpgradePromptPlan("pro");
      setUpgradePromptOpen(true);
      return;
    }
    setStrictAiEnabled(checked);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ strictAiVerification: checked }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStrictAiEnabled(!checked);
      setSettingsMessage(typeof data.error === "string" ? data.error : "Could not save AI setting.");
      return;
    }
    if (data.profile && user) {
      setUser({ ...user, strictAiVerification: data.profile.strictAiVerification === true });
    }
    setSettingsMessage(checked ? "Strict AI verification enabled." : "Strict AI verification disabled.");
  };

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

  const handleSaveContactEmail = async () => {
    if (contactSaving || !useSupabase) return;
    setContactSaving(true);
    setSettingsMessage(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_email: contactDraft.trim() === "" ? null : contactDraft.trim().toLowerCase(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSettingsMessage(typeof data.error === "string" ? data.error : "Could not save email.");
        return;
      }
      const pr = await fetch("/api/profile", { credentials: "include" }).then((r) => r.json());
      const p = pr.profile;
      if (p && user) {
        setUser({
          ...user,
          email: p.email ?? user.email,
          username: p.username ?? user.username,
          contactEmail: p.contactEmail,
          name: p.name ?? user.name,
          plan: normalizePlanId(p.plan),
          planBilling: p.planBilling ?? user.planBilling,
          createdAt: typeof p.createdAt === "string" ? p.createdAt : user.createdAt,
          premiumTrialEndsAt:
            typeof p.premiumTrialEndsAt === "string"
              ? p.premiumTrialEndsAt
              : p.premiumTrialEndsAt === null
                ? null
                : undefined,
          premiumTrialUsed: p.premiumTrialUsed === true,
        });
      }
      setSettingsMessage("Contact email saved.");
    } finally {
      setContactSaving(false);
    }
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

  const query = settingsQuery.trim().toLowerCase();
  const matchesSettingsQuery = (value: string) => query === "" || value.toLowerCase().includes(query);

  return (
    <>
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-4 pb-[max(6.5rem,env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-10 -mx-4 bg-slate-50/85 px-4 pb-3 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-xl dark:bg-[#061527]/85">
          <div className="grid grid-cols-3 items-center">
            <Link
              href="/dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-full text-slate-900 active:bg-slate-200/70 dark:text-white dark:active:bg-white/10"
              aria-label="Back to dashboard"
            >
              <ChevronLeft className="h-6 w-6" />
            </Link>
            <h1 className="text-center text-lg font-semibold text-slate-950 dark:text-white">Settings</h1>
            <div />
          </div>
          <label className="mt-4 flex h-14 items-center gap-3 rounded-2xl bg-white px-4 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-white/10">
            <Search className="h-6 w-6 text-slate-900 dark:text-white" />
            <span className="sr-only">Search settings</span>
            <input
              type="search"
              value={settingsQuery}
              onChange={(event) => setSettingsQuery(event.target.value)}
              placeholder="Search for a setting..."
              className="min-w-0 flex-1 bg-transparent text-[17px] text-slate-900 placeholder:text-slate-300 focus:outline-none dark:text-white dark:placeholder:text-slate-600"
            />
          </label>
        </header>

        <div className="space-y-5 pt-3">
          {matchesSettingsQuery("account profile plan") && (
            <section>
              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Account
              </p>
              <SettingsDisclosure
                title={user.name || user.username || "Your account"}
                description={user.contactEmail || user.email || "Signed in"}
                icon={<User className="h-5 w-5" />}
              >
                <div className="flex items-center justify-between px-4 py-4">
                  <span className="text-sm text-slate-600 dark:text-slate-300">Current plan</span>
                  <span className="rounded-full bg-prove-100 px-3 py-1 text-xs font-bold capitalize text-prove-700 dark:bg-prove-950 dark:text-prove-300">
                    {user.plan}
                  </span>
                </div>
              </SettingsDisclosure>
            </section>
          )}

          {matchesSettingsQuery("appearance theme colors accent dark") && (
            <section>
              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Appearance
              </p>
              <SettingsDisclosure
                title="Appearance"
                description="Theme colors and app style."
                icon={<Palette className="h-5 w-5" />}
              >
                <div className="motion-stagger-grid grid gap-2 p-3">
            {ACCENT_THEME_OPTIONS.map((option) => {
              const selected = accentTheme === option.id;
              const locked = !canUseAccentTheme(user?.plan, option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => updateAccentTheme(option.id)}
                  className={`flex items-center justify-between rounded-2xl border px-3 py-2.5 text-sm transition ${
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
              </SettingsDisclosure>
            </section>
          )}

          {matchesSettingsQuery("ai proof verification strict") && (
            <section>
              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Proof
              </p>
              <SettingsDisclosure
                title="AI verification"
                description={`${user.aiVerificationCount ?? 0} checks used this cycle.`}
                icon={<Sparkles className="h-5 w-5" />}
              >
          <label className="flex items-start justify-between gap-3 px-4 py-4">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">Strict AI verification</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Looks harder for stale/reused photos and asks for more specific visual evidence.
              </p>
            </div>
            <input
              type="checkbox"
              checked={strictAiEnabled}
              onChange={(event) => void handleStrictAiToggle(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-prove-600 focus:ring-prove-500 dark:border-slate-600"
            />
          </label>
              </SettingsDisclosure>
            </section>
          )}

          {matchesSettingsQuery("gallery display proof photos streak verified history") && (
            <section>
              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Gallery
              </p>
              <SettingsDisclosure
                title="Gallery display"
                description="Choose what shows in your proof gallery."
                icon={<Info className="h-5 w-5" />}
              >
            {HISTORY_SETTING_ITEMS.map((item) => (
              <label
                key={item.key}
                    className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 last:border-b-0 dark:border-white/10"
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
              </SettingsDisclosure>
            </section>
          )}

        {useSupabase && matchesSettingsQuery("contact email password reset account") && (
          <section>
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Contact
            </p>
            <SettingsDisclosure
              title="Contact email"
              description="Used for password reset links and account recovery."
              icon={<Mail className="h-5 w-5" />}
            >
              <div className="space-y-2 p-4">
              <input
                type="email"
                value={contactDraft}
                onChange={(e) => setContactDraft(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <button
                type="button"
                onClick={handleSaveContactEmail}
                disabled={contactSaving}
                  className="w-full rounded-2xl bg-prove-600 px-4 py-3 text-sm font-semibold text-white hover:bg-prove-700 disabled:opacity-70 btn-glass-primary"
              >
                {contactSaving ? "Saving…" : "Save email"}
              </button>
              </div>
            </SettingsDisclosure>
          </section>
        )}

        {useSupabase && user?.email && !isInternalAuthEmail(user.email) && matchesSettingsQuery("confirm email security") && (
          <section>
            <SettingsDisclosure
              title="Confirm email"
              description="Secure your account and enable password recovery."
              icon={<Shield className="h-5 w-5" />}
            >
              <div className="px-4 pb-4">
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
                    if (res.status === 503 && typeof data.error === "string") {
                      setConfirmEmailMessage(data.error);
                      return;
                    }
                    setConfirmEmailMessage(
                      data.error ??
                        (res.status === 401 ? "Please sign in again." : "Something went wrong. Try again later.")
                    );
                  } catch (e) {
                    setConfirmEmailMessage(e instanceof Error ? e.message : "Something went wrong. Try again later.");
                  } finally {
                    setConfirmEmailLoading(false);
                  }
                }}
                disabled={confirmEmailLoading}
                  className="w-full rounded-2xl bg-prove-600 px-4 py-3 text-sm font-semibold text-white hover:bg-prove-700 disabled:opacity-70 btn-glass-primary"
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
            </SettingsDisclosure>
          </section>
        )}

        {isCreatorAccount && matchesSettingsQuery("developer tools private guest mode") && (
          <section>
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-500">
              Developer
            </p>
            <SettingsDisclosure
              title="Developer tools"
              description="Private creator account controls."
              icon={<Lock className="h-5 w-5" />}
            >
            <div className="p-4">
            <label className="inline-flex items-center gap-2 rounded-2xl border border-amber-300 bg-white px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/35 dark:text-amber-200">
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
            </div>
            </SettingsDisclosure>
          </section>
        )}

        {matchesSettingsQuery("hide goals gallery privacy") && (
        <section>
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-red-400">
            Privacy
          </p>
          <SettingsDisclosure
            title="Hide goals from gallery"
            description="Hide a goal from Gallery without deleting proof data."
            icon={<Shield className="h-5 w-5" />}
            danger
          >
          <div className="p-4">
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
          </div>
          </SettingsDisclosure>
        </section>
        )}

        {matchesSettingsQuery("help support about legal privacy terms") && (
        <section>
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            More
          </p>
          <SettingsDisclosure
            title="Legal & support"
            description="Policies and contact links."
            icon={<HelpCircle className="h-5 w-5" />}
          >
            <Link href="/privacy" className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 dark:border-white/10">
              <Info className="h-5 w-5 text-slate-900 dark:text-white" />
              <span className="flex-1 text-sm font-medium text-slate-900 dark:text-white">Privacy Policy</span>
              <ChevronRight className="h-5 w-5 text-slate-300" />
            </Link>
            <Link href="/terms" className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 dark:border-white/10">
              <Shield className="h-5 w-5 text-slate-900 dark:text-white" />
              <span className="flex-1 text-sm font-medium text-slate-900 dark:text-white">Terms of Use</span>
              <ChevronRight className="h-5 w-5 text-slate-300" />
            </Link>
            <a
              href="mailto:contact.proveit.app@gmail.com"
              className="flex items-center gap-3 px-4 py-4"
            >
              <HelpCircle className="h-5 w-5 text-slate-900 dark:text-white" />
              <span className="flex-1 text-sm font-medium text-slate-900 dark:text-white">Help and Support</span>
              <ChevronRight className="h-5 w-5 text-slate-300" />
            </a>
          </SettingsDisclosure>
        </section>
        )}

        {matchesSettingsQuery("delete account danger") && (
        <section>
          <SettingsDisclosure
            title="Delete account"
            description="Permanently delete your account and all associated data."
            icon={<Trash2 className="h-5 w-5" />}
            danger
          >
          <div className="p-4">
          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={deletingAccount}
            className="mt-3 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {deletingAccount ? "Deleting account..." : "Delete my account"}
          </button>
          </div>
          </SettingsDisclosure>
        </section>
        )}

        {settingsMessage && (
          <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            {settingsMessage}
          </p>
        )}
        </div>
      </main>
      <UpgradePromptModal
        open={upgradePromptOpen}
        onClose={() => setUpgradePromptOpen(false)}
        requiredPlan={upgradePromptPlan}
      />
    </>
  );
}
