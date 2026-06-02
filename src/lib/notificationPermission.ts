import { isNativeCapacitorShell } from "@/lib/nativeWidgetBridge";

/** Request notification permission (native iOS/Android or web). */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  if (isNativeCapacitorShell()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const { display } = await LocalNotifications.checkPermissions();
      if (display === "granted") return true;
      const { display: after } = await LocalNotifications.requestPermissions();
      return after === "granted";
    } catch {
      return false;
    }
  }

  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export async function notificationsAreGranted(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  if (isNativeCapacitorShell()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const { display } = await LocalNotifications.checkPermissions();
      return display === "granted";
    } catch {
      return false;
    }
  }

  return "Notification" in window && Notification.permission === "granted";
}
