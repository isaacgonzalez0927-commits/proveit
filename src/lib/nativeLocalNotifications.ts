import type { Goal } from "@/types";
import { effectiveTimesPerWeek } from "@/lib/goalSchedule";
import { isNativeCapacitorShell } from "@/lib/nativeWidgetBridge";

function parseReminderTime(value: string | undefined): { hour: number; minute: number } {
  const src = value && /^\d{1,2}:\d{2}$/.test(value) ? value : "09:00";
  const [h, m] = src.split(":").map((n) => Number(n));
  return {
    hour: Number.isFinite(h) ? Math.min(23, Math.max(0, h)) : 9,
    minute: Number.isFinite(m) ? Math.min(59, Math.max(0, m)) : 0,
  };
}

/** Stable positive int for Capacitor local notification id. */
export function notificationIdForGoal(goalId: string): number {
  let hash = 0;
  for (let i = 0; i < goalId.length; i += 1) {
    hash = (hash * 31 + goalId.charCodeAt(i)) >>> 0;
  }
  return (hash % 2_000_000_000) + 1;
}

function reminderBody(goal: Goal): string {
  const tw = effectiveTimesPerWeek(goal);
  if (tw >= 7) {
    return "Daily check-in — snap a photo if you haven't verified yet today.";
  }
  return `Weekly goal — you're aiming for ${tw} verified check-in${tw === 1 ? "" : "s"} this week (Sun–Sat).`;
}

function activeReminderGoals(goals: Goal[]): Goal[] {
  return goals.filter((g) => !g.isOnBreak && !g.archivedAt && g.reminderIsActive !== false);
}

/** Schedule daily local notifications on iOS/Android (fires when app is closed). */
export async function syncNativeGoalReminders(goals: Goal[]): Promise<void> {
  if (!isNativeCapacitorShell()) return;

  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const { display } = await LocalNotifications.checkPermissions();
    if (display !== "granted") return;

    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map((n) => ({ id: n.id })),
      });
    }

    const active = activeReminderGoals(goals);
    if (active.length === 0) return;

    await LocalNotifications.schedule({
      notifications: active.map((goal) => {
        const { hour, minute } = parseReminderTime(goal.reminderTime);
        return {
          id: notificationIdForGoal(goal.id),
          title: `Reminder: ${goal.title}`,
          body: reminderBody(goal),
          schedule: {
            on: { hour, minute },
            repeats: true,
            every: "day" as const,
          },
          extra: { goalId: goal.id },
          sound: "default",
          iconColor: "#10b981",
        };
      }),
    });
  } catch {
    /* Plugin unavailable or schedule failed — web scheduler may still run in foreground */
  }
}

export async function cancelNativeGoalReminders(): Promise<void> {
  if (!isNativeCapacitorShell()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map((n) => ({ id: n.id })),
      });
    }
  } catch {
    /* ignore */
  }
}
