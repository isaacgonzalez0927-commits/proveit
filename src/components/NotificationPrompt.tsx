"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { useApp } from "@/context/AppContext";
import {
  PENDING_PLAN_AFTER_TOUR_KEY,
  TOUR_DONE_KEY,
  TOUR_DONE_VERSION,
} from "@/lib/tourStorage";

export function NotificationPrompt() {
  const { requestNotificationPermission } = useApp();
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = "proveit_notification_prompt_dismissed";
    const wasDismissed = localStorage.getItem(key);
    if (wasDismissed) setDismissed(true);
    const pendingTourPlan = Boolean(localStorage.getItem(PENDING_PLAN_AFTER_TOUR_KEY));
    const tourFinished = localStorage.getItem(TOUR_DONE_KEY) === TOUR_DONE_VERSION;
    if (pendingTourPlan && !tourFinished) {
      return;
    }
    if ("Notification" in window && Notification.permission === "default" && !wasDismissed) {
      const t = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(t);
    }
  }, []);

  const handleAllow = async () => {
    const ok = await requestNotificationPermission();
    if (ok) setShow(false);
    setDismissed(true);
    localStorage.setItem("proveit_notification_prompt_dismissed", "1");
  };

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    localStorage.setItem("proveit_notification_prompt_dismissed", "1");
  };

  if (!show || dismissed) return null;

  return (
    <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4 z-50 mx-auto max-w-md animate-slide-up rounded-2xl border border-prove-200/90 bg-white/95 p-4 shadow-soft-lg backdrop-blur-md dark:border-prove-800/60 dark:bg-slate-900/95">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-prove-100 p-2.5 dark:bg-prove-900/50">
          <Bell className="h-5 w-5 text-prove-600 dark:text-prove-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display font-semibold text-slate-900 dark:text-slate-100">
            Enable notifications
          </p>
          <p className="mt-1 text-sm leading-snug text-slate-600 dark:text-slate-400">
            Get a daily nudge for your goals so you don&apos;t miss a check-in.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={handleAllow}
              className="rounded-xl bg-prove-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-prove-700 btn-glass-primary"
            >
              Allow
            </button>
            <button
              onClick={handleDismiss}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
