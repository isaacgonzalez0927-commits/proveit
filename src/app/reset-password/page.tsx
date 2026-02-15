"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppProvider, useApp } from "@/context/AppContext";

function ResetPasswordContent() {
  const router = useRouter();
  const { supabase, useSupabase } = useApp();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!useSupabase || !supabase) {
      setError("Reset is not available.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        setError(err.message);
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 2000);
    } finally {
      setLoading(false);
    }
  };

  if (!useSupabase) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4">
        <p className="text-slate-600 dark:text-slate-400">Password reset is not configured.</p>
        <Link href="/" className="mt-4 text-prove-600 hover:underline">Go home</Link>
      </main>
    );
  }

  if (success) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4">
        <p className="text-prove-600 dark:text-prove-400 font-medium">Password updated! Redirecting to dashboard…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4">
      <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Set new password</h1>
      <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">Enter your new password below.</p>
      <form onSubmit={handleSubmit} className="mt-6 w-full space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">New password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            placeholder="At least 6 characters"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Confirm password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            placeholder="Confirm new password"
            required
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-prove-600 py-3 font-semibold text-white hover:bg-prove-700 disabled:opacity-70"
        >
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>
      <Link href="/" className="mt-6 text-sm text-prove-600 hover:underline">← Back to sign in</Link>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <AppProvider>
      <ResetPasswordContent />
    </AppProvider>
  );
}
