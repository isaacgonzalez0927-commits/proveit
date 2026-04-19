import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Goal, ProofSubmission } from "@/types";
import { getGoalStreak, isGoalDoneInCurrentWindow } from "./goalProgress";

function goal(over: Partial<Goal> = {}): Goal {
  return {
    id: "g1",
    userId: "u1",
    title: "Test",
    frequency: "daily",
    timesPerWeek: 7,
    createdAt: "2026-01-01T00:00:00.000Z",
    completedDates: [],
    ...over,
  } as Goal;
}

describe("getGoalStreak / isGoalDoneInCurrentWindow with submission date formats", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-15T18:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts today for streak when submission date is ISO timestamptz string", () => {
    const today = "2026-04-15";
    const subs: ProofSubmission[] = [
      {
        id: "s1",
        goalId: "g1",
        date: `${today}T14:30:00.000Z`,
        imageDataUrl: "x",
        status: "verified",
        createdAt: "2026-04-15T14:30:00.000Z",
      },
    ];
    const getSubmissionsForGoal = () => subs;
    expect(getGoalStreak(goal(), getSubmissionsForGoal)).toBeGreaterThanOrEqual(1);
    expect(isGoalDoneInCurrentWindow(goal(), getSubmissionsForGoal, today)).toBe(true);
  });

  it("counts calendar day when submission date is plain yyyy-MM-dd", () => {
    const today = "2026-04-15";
    const subs: ProofSubmission[] = [
      {
        id: "s1",
        goalId: "g1",
        date: today,
        imageDataUrl: "x",
        status: "verified",
        createdAt: "2026-04-15T12:00:00.000Z",
      },
    ];
    const getSubmissionsForGoal = () => subs;
    expect(getGoalStreak(goal(), getSubmissionsForGoal)).toBeGreaterThanOrEqual(1);
    expect(isGoalDoneInCurrentWindow(goal(), getSubmissionsForGoal, today)).toBe(true);
  });
});
