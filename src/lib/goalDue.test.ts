import { describe, expect, it } from "vitest";
import {
  countVerifiedInCalendarWeek,
  hasVerifiedSubmissionOnDate,
  isWithinSubmissionWindow,
  weeklyCheckInProgressLine,
} from "@/lib/goalDue";
import type { Goal, ProofSubmission } from "@/types";

const baseWeeklyGoal = {
  id: "g1",
  userId: "u1",
  title: "Test",
  frequency: "weekly" as const,
  timesPerWeek: 3 as const,
  createdAt: "2026-01-01T00:00:00.000Z",
  completedDates: [],
};

function sub(
  partial: Pick<ProofSubmission, "date" | "status"> & Partial<Omit<ProofSubmission, "date" | "status">>
): Pick<ProofSubmission, "date" | "status"> {
  return { date: partial.date, status: partial.status };
}

describe("hasVerifiedSubmissionOnDate", () => {
  it("treats ISO timestamps as the same calendar day", () => {
    const subs = [sub({ date: "2026-04-11T00:00:00.000Z", status: "verified" })];
    expect(hasVerifiedSubmissionOnDate(subs, "2026-04-11")).toBe(true);
  });
});

describe("countVerifiedInCalendarWeek", () => {
  it("counts verified rows in the same Sun–Sat week as reference", () => {
    // Sunday 12 Apr 2026 (new week); Saturday 11 Apr is previous week
    const ref = new Date(2026, 3, 12, 10, 0, 0);
    const subs = [
      sub({ date: "2026-04-11", status: "verified" }),
      sub({ date: "2026-04-12", status: "verified" }),
    ];
    expect(countVerifiedInCalendarWeek(subs, ref)).toBe(1);
  });
});

describe("isWithinSubmissionWindow", () => {
  it("allows submit when under weekly cap and not verified today", () => {
    const goal = { ...baseWeeklyGoal } as Goal;
    const now = new Date(2026, 3, 14, 12, 0, 0);
    const subs = [sub({ date: "2026-04-13", status: "verified" })];
    expect(isWithinSubmissionWindow(goal, now, subs)).toBe(true);
  });

  it("blocks when weekly verified count reached", () => {
    const goal = { ...baseWeeklyGoal } as Goal;
    const now = new Date(2026, 3, 14, 12, 0, 0);
    const subs = [
      sub({ date: "2026-04-12", status: "verified" }),
      sub({ date: "2026-04-13", status: "verified" }),
      sub({ date: "2026-04-14", status: "verified" }),
    ];
    expect(isWithinSubmissionWindow(goal, now, subs)).toBe(false);
  });
});

describe("weeklyCheckInProgressLine", () => {
  it("returns null for daily-equivalent targets", () => {
    const goal = { ...baseWeeklyGoal, timesPerWeek: 7 as const } as Goal;
    expect(weeklyCheckInProgressLine(goal, [], new Date())).toBeNull();
  });
});
