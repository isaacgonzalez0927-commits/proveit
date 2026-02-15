"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { useApp } from "@/context/AppContext";

export function NotificationPrompt() {
  const { requestNotificationPermission } = useApp();
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = "proveit_notification_prompt_dismissed";
    const wasDismissed = localStorage.getItem(key);
    if (wasDismissed) setDismissed(true);
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
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-slide-up rounded-xl border border-prove-200 bg-white p-4 shadow-lg dark:border-prove-800 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-prove-100 p-2 dark:bg-prove-900/50">
          <Bell className="h-5 w-5 text-prove-600 dark:text-prove-400" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-slate-900 dark:text-slate-100">
            Enable notifications
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Get reminded to do your daily and weekly goals so you never miss a beat.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleAllow}
              className="rounded-lg bg-prove-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-prove-700"
            >
              Allow
            </button>
            <button
              onClick={handleDismiss}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
