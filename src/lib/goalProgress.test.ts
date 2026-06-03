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

  it("does not count a partial daily week toward streak until the full quota is met", () => {
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
    expect(getGoalStreak(goal(), getSubmissionsForGoal)).toBe(0);
    expect(isGoalDoneInCurrentWindow(goal(), getSubmissionsForGoal, today)).toBe(true);
  });

  it("counts a full daily week toward streak when all 7 proofs are in the same week", () => {
    const subs: ProofSubmission[] = [
      "2026-04-12",
      "2026-04-13",
      "2026-04-14",
      "2026-04-15",
      "2026-04-16",
      "2026-04-17",
      "2026-04-18",
    ].map((date, i) => ({
      id: `s${i}`,
      goalId: "g1",
      date,
      imageDataUrl: "x",
      status: "verified" as const,
      createdAt: `${date}T12:00:00.000Z`,
    }));
    expect(getGoalStreak(goal(), () => subs)).toBe(1);
  });

  it("does not increment the current weekly streak until the full quota is met", () => {
    const weekly = goal({ frequency: "weekly", timesPerWeek: 3 });
    const subs: ProofSubmission[] = [
      {
        id: "s1",
        goalId: "g1",
        date: "2026-04-15",
        imageDataUrl: "x",
        status: "verified",
        createdAt: "2026-04-15T12:00:00.000Z",
      },
    ];
    expect(getGoalStreak(weekly, () => subs)).toBe(0);
  });

  it("keeps past weekly streak visible until the current week quota is met or fails", () => {
    const weekly = goal({ frequency: "weekly", timesPerWeek: 3 });
    const subs: ProofSubmission[] = [
      {
        id: "s1",
        goalId: "g1",
        date: "2026-04-15",
        imageDataUrl: "x",
        status: "verified",
        createdAt: "2026-04-15T12:00:00.000Z",
      },
      {
        id: "s2",
        goalId: "g1",
        date: "2026-04-08",
        imageDataUrl: "x",
        status: "verified",
        createdAt: "2026-04-08T12:00:00.000Z",
      },
      {
        id: "s3",
        goalId: "g1",
        date: "2026-04-09",
        imageDataUrl: "x",
        status: "verified",
        createdAt: "2026-04-09T12:00:00.000Z",
      },
      {
        id: "s4",
        goalId: "g1",
        date: "2026-04-10",
        imageDataUrl: "x",
        status: "verified",
        createdAt: "2026-04-10T12:00:00.000Z",
      },
    ];
    expect(getGoalStreak(weekly, () => subs)).toBe(1);
  });

  it("lets a Streak Shield protect a missed prior weekly quota without counting partial current progress", () => {
    const weekly = goal({ frequency: "weekly", timesPerWeek: 3 });
    const subs: ProofSubmission[] = [
      {
        id: "s1",
        goalId: "g1",
        date: "2026-04-15",
        imageDataUrl: "x",
        status: "verified",
        createdAt: "2026-04-15T12:00:00.000Z",
      },
      {
        id: "s2",
        goalId: "g1",
        date: "2026-04-08",
        imageDataUrl: "x",
        status: "verified",
        createdAt: "2026-04-08T12:00:00.000Z",
      },
      {
        id: "s3",
        goalId: "g1",
        date: "2026-04-09",
        imageDataUrl: "x",
        status: "verified",
        createdAt: "2026-04-09T12:00:00.000Z",
      },
    ];
    expect(getGoalStreak(weekly, () => subs, [{ goalId: "g1", weekStart: "2026-04-05" }])).toBe(1);
  });

  it("prorates signup week quota for streak and allows first streak mid-week", () => {
    vi.setSystemTime(new Date("2026-05-23T18:00:00.000Z")); // Sat in signup week
    const weekly = goal({
      frequency: "weekly",
      timesPerWeek: 6,
      createdAt: "2026-05-21T10:00:00.000Z", // Thu
    });
    const subs: ProofSubmission[] = [
      "2026-05-21",
      "2026-05-22",
      "2026-05-23",
    ].map((date, i) => ({
      id: `s${i}`,
      goalId: "g1",
      date,
      imageDataUrl: "x",
      status: "verified" as const,
      createdAt: `${date}T12:00:00.000Z`,
    }));
    expect(getGoalStreak(weekly, () => subs)).toBe(1);
  });

  it("does not break streak on a missed prorated signup week", () => {
    vi.setSystemTime(new Date("2026-05-29T18:00:00.000Z")); // Fri in the week after signup
    const weekly = goal({
      frequency: "weekly",
      timesPerWeek: 6,
      createdAt: "2026-05-21T10:00:00.000Z",
    });
    const subs: ProofSubmission[] = [
      "2026-05-25",
      "2026-05-26",
      "2026-05-27",
      "2026-05-28",
      "2026-05-29",
      "2026-05-30",
    ].map((date, i) => ({
      id: `w2-${i}`,
      goalId: "g1",
      date,
      imageDataUrl: "x",
      status: "verified" as const,
      createdAt: `${date}T12:00:00.000Z`,
    }));
    expect(getGoalStreak(weekly, () => subs)).toBe(1);
  });
});
