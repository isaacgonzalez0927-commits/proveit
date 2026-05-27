import { describe, expect, it } from "vitest";
import type { Goal, User } from "@/types";
import { buildWidgetSnapshot } from "./widgetSnapshot";

const user: User = {
  id: "u1",
  email: "a@b.com",
  plan: "pro",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const goal: Goal = {
  id: "g1",
  userId: "u1",
  title: "Read",
  frequency: "daily",
  createdAt: "2026-01-01T00:00:00.000Z",
  completedDates: [],
};

describe("buildWidgetSnapshot", () => {
  it("returns signed-out placeholder when no user", () => {
    const snap = buildWidgetSnapshot({
      user: null,
      goals: [],
      getSubmissionsForGoal: () => [],
      graceDayEvents: [],
    });
    expect(snap.signedIn).toBe(false);
    expect(snap.maxStreak).toBe(0);
  });

  it("includes streak data for signed-in users", () => {
    const snap = buildWidgetSnapshot({
      user,
      goals: [goal],
      getSubmissionsForGoal: () => [],
      graceDayEvents: [],
    });
    expect(snap.signedIn).toBe(true);
    expect(snap.topGoalTitle).toBe("Read");
    expect(snap.gardenTotal).toBe(1);
  });
});
