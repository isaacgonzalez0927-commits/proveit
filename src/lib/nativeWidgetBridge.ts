export interface WidgetSnapshot {
  updatedAt: string;
  signedIn: boolean;
  maxStreak: number;
  topGoalTitle: string;
  topGoalStreak: number;
  goalsDoneToday: number;
  goalsDueToday: number;
  gardenWatered: number;
  gardenTotal: number;
  streakUnit: "day" | "week";
}

export interface WidgetBridgePlugin {
  updateSnapshot(options: { payload: string }): Promise<void>;
  reloadWidgets(): Promise<void>;
}

/** True when running inside the Capacitor native shell. */
export function isNativeCapacitorShell(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());
}

export async function pushWidgetSnapshot(snapshot: WidgetSnapshot): Promise<void> {
  if (!isNativeCapacitorShell()) return;
  try {
    const { registerPlugin } = await import("@capacitor/core");
    const WidgetBridge = registerPlugin<WidgetBridgePlugin>("WidgetBridge");
    await WidgetBridge.updateSnapshot({ payload: JSON.stringify(snapshot) });
  } catch {
    // Widget bridge unavailable (web or plugin not linked yet).
  }
}
