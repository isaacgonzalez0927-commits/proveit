import { describe, expect, it } from "vitest";
import {
  addBreakSessionToProUsage,
  canProStartGoalBreak,
  getProBreakDaysUsedInCalendarMonth,
  isProBreakExpired,
  PRO_BREAK_DAYS_PER_MONTH,
} from "@/lib/goalBreak";
import type { Goal } from "@/types";

const base: Pick<Goal, "isOnBreak" | "breakStartedAt" | "proBreakUsageByMonth"> = {
  isOnBreak: false,
  breakStartedAt: undefined,
  proBreakUsageByMonth: {},
};

describe("addBreakSessionToProUsage", () => {
  it("counts each calendar day in range into yyyy-MM buckets", () => {
    const u = addBreakSessionToProUsage(
      {},
      new Date(2026, 3, 10).toISOString(),
      new Date(2026, 3, 12).toISOString()
    );
    expect(u["2026-04"]).toBe(3);
  });

  it("splits days across months", () => {
    const u = addBreakSessionToProUsage(
      {},
      new Date(2026, 2, 30).toISOString(),
      new Date(2026, 3, 2).toISOString()
    );
    expect(u["2026-03"]).toBe(2);
    expect(u["2026-04"]).toBe(2);
  });
});

describe("getProBreakDaysUsedInCalendarMonth", () => {
  it("includes active break session days in the month", () => {
    const goal = {
      ...base,
      isOnBreak: true,
      breakStartedAt: new Date(2026, 3, 10, 8, 0, 0).toISOString(),
      proBreakUsageByMonth: { "2026-04": 2 },
    };
    const now = new Date(2026, 3, 12, 15, 0, 0);
    expect(getProBreakDaysUsedInCalendarMonth(goal, "2026-04", now)).toBe(2 + 3);
  });
});

describe("canProStartGoalBreak", () => {
  it("blocks when completed usage already hit the monthly cap", () => {
    const goal = {
      ...base,
      proBreakUsageByMonth: { "2026-04": PRO_BREAK_DAYS_PER_MONTH },
    };
    const now = new Date(2026, 3, 15);
    expect(canProStartGoalBreak(goal, now)).toBe(false);
  });

  it("allows when under cap", () => {
    const goal = {
      ...base,
      proBreakUsageByMonth: { "2026-04": PRO_BREAK_DAYS_PER_MONTH - 1 },
    };
    const now = new Date(2026, 3, 15);
    expect(canProStartGoalBreak(goal, now)).toBe(true);
  });
});

describe("isProBreakExpired", () => {
  it("returns false on the 7th calendar day of a break in the month", () => {
    const goal = {
      ...base,
      isOnBreak: true,
      breakStartedAt: new Date(2026, 3, 5, 10, 0, 0).toISOString(),
      proBreakUsageByMonth: {},
    } as Goal;
    const now = new Date(2026, 3, 11, 12, 0, 0);
    expect(isProBreakExpired(goal, "pro", now)).toBe(false);
  });

  it("returns true on the 8th calendar day in the month for this session", () => {
    const goal = {
      ...base,
      isOnBreak: true,
      breakStartedAt: new Date(2026, 3, 4, 10, 0, 0).toISOString(),
      proBreakUsageByMonth: {},
    } as Goal;
    const now = new Date(2026, 3, 11, 12, 0, 0);
    expect(isProBreakExpired(goal, "pro", now)).toBe(true);
  });
});
