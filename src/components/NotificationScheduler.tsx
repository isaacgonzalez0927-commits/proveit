"use client";

import { useEffect, useRef } from "react";
import { useApp } from "@/context/AppContext";
import { extractCalendarDateKey } from "@/lib/dateUtils";
import { countVerifiedInCalendarWeek, isWithinSubmissionWindow } from "@/lib/goalDue";
import { effectiveTimesPerWeek, getEffectiveQuotaForWeek, shortWeekLabel } from "@/lib/goalSchedule";
import { format } from "date-fns";
import type { Goal } from "@/types";
import { isNativeCapacitorShell } from "@/lib/nativeWidgetBridge";

const STORAGE_KEY_PREFIX = "proveit_notification_";

function parseTime(value: string | undefined, fallback: string) {
  const src = value && /^\d{1,2}:\d{2}$/.test(value) ? value : fallback;
  const [h, m] = src.split(":").map((n) => Number(n));
  return { hour: h, minute: m };
}

export function NotificationScheduler() {
  const { user, goals, getSubmissionsForGoal } = useApp();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isNativeCapacitorShell()) return;
    if (!user || typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const activeGoals = goals.filter((g) => !g.isOnBreak && !g.archivedAt && g.reminderIsActive !== false);
    if (activeGoals.length === 0) return;

    function maybeSendForGoal(goal: Goal) {
      const now = new Date();
      const today = format(now, "yyyy-MM-dd");
      const { hour, minute } = parseTime(goal.reminderTime, "09:00");
      const reminder = new Date(now);
      reminder.setHours(hour, minute, 0, 0);
      const diff = now.getTime() - reminder.getTime();
      if (diff < 0 || diff > 15 * 60 * 1000) return;

      const key = `${STORAGE_KEY_PREFIX}${goal.id}_${today}`;
      if (localStorage.getItem(key)) return;

      const subs = getSubmissionsForGoal(goal.id);
      const doneToday = subs.some(
        (s) => s.status === "verified" && extractCalendarDateKey(s.date) === today
      );
      if (doneToday) return;
      if (!isWithinSubmissionWindow(goal, now, subs)) return;

      const fullTw = effectiveTimesPerWeek(goal);
      const tw = getEffectiveQuotaForWeek(goal, now);
      const weekCount = countVerifiedInCalendarWeek(subs, now);
      const remainingProofs = Math.max(0, tw - weekCount);
      const remainingDays = Math.max(0, 6 - now.getDay());
      const signupNote = shortWeekLabel(goal, now);
      const urgentPrefix =
        remainingProofs > 0 && remainingDays <= 1
          ? "Critical: "
          : remainingProofs >= Math.max(1, remainingDays)
            ? "Heads up: "
            : "";
      const body =
        fullTw >= 7
          ? "Daily check-in — snap a photo if you haven’t verified yet today."
          : `${urgentPrefix}You’re at ${weekCount}/${tw} verified check-ins this week (Sun–Sat). ${remainingProofs} left with ${remainingDays + 1} day${remainingDays === 0 ? "" : "s"} to go.${signupNote ? ` ${signupNote}.` : ""}`;

      const n = new Notification(`Reminder: ${goal.title}`, {
        body,
        icon: "/icon.png",
        tag: key,
      });
      n.onclick = () => {
        window.focus();
        if (typeof window !== "undefined" && window.location) {
          window.location.href = `/goals/submit?goalId=${encodeURIComponent(goal.id)}`;
        }
        n.close();
      };
      localStorage.setItem(key, "1");
    }

    function check() {
      activeGoals.forEach(maybeSendForGoal);
    }

    check();
    intervalRef.current = setInterval(check, 30 * 1000); // every 30s so we hit the 15-min reminder window
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user, goals, getSubmissionsForGoal]);

  return null;
}
