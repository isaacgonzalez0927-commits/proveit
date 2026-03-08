"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useApp } from "@/context/AppContext";

const EMAIL_FORMAT = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/;

export default function ChangeEmailPage() {
  const router = useRouter();
  const { user, supabase, useSupabase, authReady } = useApp();
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      router.replace("/dashboard");
      return;
    }
  }, [authReady, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmed = newEmail.trim();
    if (!trimmed) {
      setError("Enter a new email address.");
      return;
    }
    if (!EMAIL_FORMAT.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (trimmed !== confirmEmail.trim()) {
      setError("The two email addresses don't match.");
      return;
    }
    if (trimmed === user?.email) {
      setError("New email is the same as your current email.");
      return;
    }
    if (!useSupabase || !supabase) {
      setError("Email change is not available.");
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ email: trimmed });
      if (err) {
        setError(err.message);
        return;
      }
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  if (!authReady || !user) {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
      </main>
    );
  }

  if (success) {
    return (
      <main className="mx-auto max-w-md px-4 py-8 pb-[max(6.5rem,env(safe-area-inset-bottom))]">
        <Link
          href="/settings"
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to settings
        </Link>
        <div className="rounded-2xl border border-prove-200 bg-prove-50 p-6 dark:border-prove-800 dark:bg-prove-950/30">
          <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">Check your new email</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            We sent a confirmation link to <strong>{newEmail.trim()}</strong>. Click that link to confirm the change. Your email will update after you confirm.
          </p>
          <Link
            href="/settings"
            className="mt-6 inline-block rounded-lg bg-prove-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-prove-700 btn-glass-primary"
          >
            Back to settings
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-8 pb-[max(6.5rem,env(safe-area-inset-bottom))]">
      <Link
        href="/settings"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to settings
      </Link>
      <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Change email</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Enter your new email. We’ll send a confirmation link there to complete the change.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Current email</label>
          <input
            type="email"
            value={user?.email ?? ""}
            readOnly
            className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">New email</label>
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Confirm new email</label>
          <input
            type="email"
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-prove-600 py-3 font-medium text-white hover:bg-prove-700 disabled:opacity-70 btn-glass-primary"
        >
          {loading ? "Updating…" : "Update email"}
        </button>
      </form>
    </main>
  );
}
