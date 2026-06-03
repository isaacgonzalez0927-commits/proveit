import { describe, expect, it, beforeEach } from "vitest";
import { isWelcomeWeekJustCompleted, completeWelcomeWeekIfNeeded } from "./welcomeWeek";

const goal = {
  id: "g1",
  title: "Read",
  frequency: "weekly" as const,
  timesPerWeek: 6 as const,
  reminderDays: undefined,
  createdAt: "2026-05-21T10:00:00.000Z",
};

function d(iso: string) {
  return new Date(iso + "T12:00:00");
}

describe("welcomeWeek", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("detects when prorated signup quota is first completed", () => {
    const now = d("2026-05-23");
    const before = [
      { date: "2026-05-21", status: "verified" as const },
      { date: "2026-05-22", status: "verified" as const },
    ];
    const after = [...before, { date: "2026-05-23", status: "verified" as const }];
    expect(isWelcomeWeekJustCompleted(goal, before, after, now)).toBe(true);
  });

  it("persists welcome week completion once", () => {
    const now = d("2026-05-23");
    const before = [
      { date: "2026-05-21", status: "verified" as const },
      { date: "2026-05-22", status: "verified" as const },
    ];
    const after = [...before, { date: "2026-05-23", status: "verified" as const }];
    expect(completeWelcomeWeekIfNeeded(goal, before, after, now)).toBe(true);
    expect(completeWelcomeWeekIfNeeded(goal, before, after, now)).toBe(false);
  });
});
