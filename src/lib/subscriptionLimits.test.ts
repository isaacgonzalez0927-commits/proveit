import { describe, expect, it } from "vitest";
import type { Goal } from "@/types";
import {
  countActiveReminders,
  freezeRemindersBeyondLimit,
  getActiveReminderLimit,
  getAiCoachLimit,
  getAiVerificationLimit,
  getGraceDayResetBalance,
} from "./subscriptionLimits";

function goal(id: string, createdAt: string, active = true): Goal {
  return {
    id,
    userId: "u1",
    title: id,
    frequency: "weekly",
    timesPerWeek: 3,
    reminderTime: "09:00",
    reminderIsActive: active,
    createdAt,
    completedDates: [],
  };
}

describe("subscription limits", () => {
  it("caps reminders, streak shields, and AI Coach by plan", () => {
    expect(getActiveReminderLimit("free")).toBe(2);
    expect(getActiveReminderLimit("pro")).toBe(5);
    expect(getGraceDayResetBalance("free")).toBe(0);
    expect(getGraceDayResetBalance("pro")).toBe(1);
    expect(getGraceDayResetBalance("premium")).toBe(1);
    expect(getAiCoachLimit("free")).toBe(0);
    expect(getAiCoachLimit("pro")).toBe(5);
    expect(getAiCoachLimit("premium")).toBe(20);
    // Photo verification / Gardener's Note is unlimited
    expect(getAiVerificationLimit("free")).toBe(Number.MAX_SAFE_INTEGER);
    expect(getAiVerificationLimit("pro")).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("freezes reminders beyond the allowed active limit", () => {
    const frozen = freezeRemindersBeyondLimit(
      [
        goal("g1", "2026-01-01T00:00:00.000Z"),
        goal("g2", "2026-01-02T00:00:00.000Z"),
        goal("g3", "2026-01-03T00:00:00.000Z"),
      ],
      2
    );
    expect(countActiveReminders(frozen)).toBe(2);
    expect(frozen.find((g) => g.id === "g3")?.reminderIsActive).toBe(false);
  });
});
