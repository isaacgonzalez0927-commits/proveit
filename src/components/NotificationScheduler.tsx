"use client";

import { useEffect, useRef } from "react";
import { useApp } from "@/context/AppContext";
import { format } from "date-fns";
import { getReminderDays } from "@/lib/goalDue";
import type { Goal } from "@/types";

const STORAGE_KEY_PREFIX = "proveit_notification_";

function parseTime(value: string | undefined, fallback: string) {
  const src = value && /^\d{2}:\d{2}$/.test(value) ? value : fallback;
  const [h, m] = src.split(":").map((n) => Number(n));
  return { hour: h, minute: m };
}

export function NotificationScheduler() {
  const { user, goals, getSubmissionsForGoal } = useApp();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user || typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const activeGoals = goals.filter((g) => !g.isOnBreak);
    if (activeGoals.length === 0) return;

    function maybeSendForGoal(goal: Goal) {
      const now = new Date();
      const today = format(now, "yyyy-MM-dd");
      const todayDay = now.getDay();
      const reminderDays = getReminderDays(goal);
      if (!reminderDays.includes(todayDay)) return;

      const { hour, minute } = parseTime(goal.reminderTime, goal.frequency === "daily" ? "09:00" : "10:00");
      const reminder = new Date(now);
      reminder.setHours(hour, minute, 0, 0);
      const diff = now.getTime() - reminder.getTime();
      if (diff < 0 || diff > 15 * 60 * 1000) return;

      const key = `${STORAGE_KEY_PREFIX}${goal.id}_${today}`;
      if (localStorage.getItem(key)) return;

      const subs = getSubmissionsForGoal(goal.id).filter((s) => s.status === "verified");
      const doneToday = subs.some((s) => s.date === today);
      if (doneToday) return;

      new Notification("ProveIt", {
        body: `Time to ${goal.title}. Prove it with a photo.`,
        icon: "/favicon.ico",
      });
      localStorage.setItem(key, "1");
    }

    function check() {
      activeGoals.forEach(maybeSendForGoal);
    }

    check();
    intervalRef.current = setInterval(check, 60 * 1000); // every minute
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user, goals, getSubmissionsForGoal]);

  return null;
}
