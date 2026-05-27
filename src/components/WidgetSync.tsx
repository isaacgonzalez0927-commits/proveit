"use client";

import { useEffect, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { pushWidgetSnapshot } from "@/lib/nativeWidgetBridge";
import { buildWidgetSnapshot } from "@/lib/widgetSnapshot";

/** Keeps the iOS home-screen widget in sync with dashboard state. */
export function WidgetSync() {
  const { user, goals, submissions, graceDayEvents, getSubmissionsForGoal } = useApp();

  const snapshot = useMemo(
    () =>
      buildWidgetSnapshot({
        user,
        goals,
        getSubmissionsForGoal,
        graceDayEvents,
      }),
    [user, goals, submissions, graceDayEvents, getSubmissionsForGoal]
  );

  useEffect(() => {
    void pushWidgetSnapshot(snapshot);
  }, [snapshot]);

  return null;
}
