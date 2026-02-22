"use client";

import { useEffect, useRef } from "react";
import { useApp } from "@/context/AppContext";
import { format } from "date-fns";

const STORAGE_KEY_DAILY_PREFIX = "proveit_last_daily_notification_";
const STORAGE_KEY_WEEKLY_PREFIX = "proveit_last_weekly_notification_";

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

    const dailyGoals = goals.filter((g) => g.frequency === "daily" && !g.isOnBreak);
    const weeklyGoals = goals.filter((g) => g.frequency === "weekly" && !g.isOnBreak);
    if (dailyGoals.length === 0 && weeklyGoals.length === 0) return;

    function maybeSendDaily() {
      const now = new Date();
      const today = format(now, "yyyy-MM-dd");

      dailyGoals.forEach((g) => {
        const { hour, minute } = parseTime(g.reminderTime, "09:00");
        const reminder = new Date(now);
        reminder.setHours(hour, minute, 0, 0);
        const diff = now.getTime() - reminder.getTime();
        if (diff < 0 || diff > 15 * 60 * 1000) return;

        const key = `${STORAGE_KEY_DAILY_PREFIX}${g.id}_${today}`;
        if (localStorage.getItem(key)) return;

        const subs = getSubmissionsForGoal(g.id).filter((s) => s.status === "verified");
        const doneToday = subs.some((s) => s.date === today);
        if (doneToday) return;

        new Notification("ProveIt – Daily goal", {
          body: `Time to ${g.title}. Prove it with a photo before midnight.`,
          icon: "/favicon.ico",
        });
        localStorage.setItem(key, "1");
      });
    }

    function maybeSendWeekly() {
      const now = new Date();
      const weekKey = format(now, "yyyy-'W'ww");

      weeklyGoals.forEach((g) => {
        const day = typeof g.reminderDay === "number" ? g.reminderDay : 0;
        if (now.getDay() !== day) return;

        const { hour, minute } = parseTime(g.reminderTime, "10:00");
        const reminder = new Date(now);
        reminder.setHours(hour, minute, 0, 0);
        const diff = now.getTime() - reminder.getTime();
        if (diff < 0 || diff > 15 * 60 * 1000) return;

        const key = `${STORAGE_KEY_WEEKLY_PREFIX}${g.id}_${weekKey}`;
        if (localStorage.getItem(key)) return;

        const subs = getSubmissionsForGoal(g.id).filter((s) => s.status === "verified");
        const thisWeek = subs.some((s) => {
          const d = new Date(s.date);
          const sun = new Date(now);
          sun.setDate(sun.getDate() - sun.getDay());
          const nextSun = new Date(sun);
          nextSun.setDate(nextSun.getDate() + 7);
          return d >= sun && d < nextSun;
        });
        if (thisWeek) return;

        new Notification("ProveIt – Weekly goal", {
          body: `You still need to complete: ${g.title}. Submit a photo before midnight.`,
          icon: "/favicon.ico",
        });
        localStorage.setItem(key, "1");
      });
    }

    function check() {
      maybeSendDaily();
      maybeSendWeekly();
    }

    check();
    intervalRef.current = setInterval(check, 60 * 1000); // every minute
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user, goals, getSubmissionsForGoal]);

  return null;
}
