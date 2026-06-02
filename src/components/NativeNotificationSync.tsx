"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { isNativeCapacitorShell } from "@/lib/nativeWidgetBridge";
import {
  cancelNativeGoalReminders,
  syncNativeGoalReminders,
} from "@/lib/nativeLocalNotifications";

/** iOS/Android: schedule local reminders; open goal submit when notification is tapped. */
export function NativeNotificationSync() {
  const { user, goals } = useApp();
  const router = useRouter();
  const listenerReady = useRef(false);

  useEffect(() => {
    if (!isNativeCapacitorShell()) return;

    let removeListener: (() => void) | undefined;

    void import("@capacitor/local-notifications").then(({ LocalNotifications }) => {
      if (listenerReady.current) return;
      listenerReady.current = true;

      void LocalNotifications.addListener(
        "localNotificationActionPerformed",
        (event) => {
          const goalId = event.notification.extra?.goalId;
          if (typeof goalId === "string" && goalId.length > 0) {
            router.push(`/goals/submit?goalId=${encodeURIComponent(goalId)}`);
          } else {
            router.push("/dashboard");
          }
        }
      ).then((handle) => {
        removeListener = () => void handle.remove();
      });
    });

    return () => {
      removeListener?.();
    };
  }, [router]);

  useEffect(() => {
    if (!isNativeCapacitorShell()) return;
    if (!user) {
      void cancelNativeGoalReminders();
      return;
    }
    void syncNativeGoalReminders(goals);
  }, [user, goals]);

  return null;
}
