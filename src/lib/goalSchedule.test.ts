import { describe, expect, it } from "vitest";
import {
  effectiveTimesPerWeek,
  getEffectiveQuotaForWeek,
  getExpectedVerifiedForWeek,
  isGoalSignupWeek,
  shortWeekLabel,
  spreadReminderDaysForTimesPerWeek,
  timesPerWeekSummary,
} from "./goalSchedule";

function goal(over: {
  timesPerWeek?: number;
  frequency?: "daily" | "weekly";
  createdAt?: string;
}) {
  return {
    frequency: over.frequency ?? ("weekly" as const),
    timesPerWeek: over.timesPerWeek as 1 | 2 | 3 | 4 | 5 | 6 | 7 | undefined,
    reminderDays: undefined,
    createdAt: over.createdAt ?? "2026-01-01T00:00:00.000Z",
  };
}

function d(iso: string) {
  return new Date(iso + "T12:00:00");
}
describe("spreadReminderDaysForTimesPerWeek", () => {
  it("returns all days for 7+", () => {
    expect(spreadReminderDaysForTimesPerWeek(7)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(spreadReminderDaysForTimesPerWeek(10)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("spreads 3 across the week", () => {
    expect(spreadReminderDaysForTimesPerWeek(3)).toEqual([0, 2, 4]);
  });

  it("handles 1", () => {
    expect(spreadReminderDaysForTimesPerWeek(1)).toEqual([3]);
  });
});

describe("effectiveTimesPerWeek", () => {
  it("prefers explicit timesPerWeek", () => {
    const g = { frequency: "weekly" as const, timesPerWeek: 4 as const, reminderDays: [0, 1] };
    expect(effectiveTimesPerWeek(g)).toBe(4);
  });

  it("uses reminderDays length when times missing", () => {
    const g = { frequency: "weekly" as const, timesPerWeek: undefined, reminderDays: [1, 3, 5] };
    expect(effectiveTimesPerWeek(g)).toBe(3);
  });
});

describe("timesPerWeekSummary", () => {
  it("describes once and daily without fixed weekday copy", () => {
    expect(timesPerWeekSummary(1).headline).toBe("Once a week");
    expect(timesPerWeekSummary(1).detailLine.toLowerCase()).toContain("reminder");
    expect(timesPerWeekSummary(7).headline).toBe("Daily check-ins");
    expect(timesPerWeekSummary(7).detailLine.toLowerCase()).toContain("daily");
  });
});

describe("getEffectiveQuotaForWeek (signup week proration)", () => {
  it("uses full quota outside the signup week", () => {
    const g = goal({ timesPerWeek: 6, createdAt: "2026-05-21T10:00:00.000Z" }); // Thu May 21
    expect(getEffectiveQuotaForWeek(g, d("2026-05-28"))).toBe(6); // next week Thu
  });

  it("prorates 6×/week when created mid-week", () => {
    const g = goal({ timesPerWeek: 6, createdAt: "2026-05-21T10:00:00.000Z" }); // Thu
    expect(isGoalSignupWeek(g, d("2026-05-22"))).toBe(true);
    expect(getEffectiveQuotaForWeek(g, d("2026-05-22"))).toBe(3); // Thu–Sat
  });

  it("keeps full quota when created on Sunday", () => {
    const g = goal({ timesPerWeek: 6, createdAt: "2026-05-24T10:00:00.000Z" }); // Sun
    expect(getEffectiveQuotaForWeek(g, d("2026-05-27"))).toBe(6);
  });

  it("prorates daily goals on a short signup week", () => {
    const g = goal({ timesPerWeek: 7, frequency: "daily", createdAt: "2026-05-21T10:00:00.000Z" });
    expect(getEffectiveQuotaForWeek(g, d("2026-05-22"))).toBe(3);
  });
});

describe("getExpectedVerifiedForWeek", () => {
  it("does not expect proofs before the goal existed in the signup week", () => {
    const g = goal({ timesPerWeek: 6, createdAt: "2026-05-21T10:00:00.000Z" }); // Thu
    expect(getExpectedVerifiedForWeek(g, d("2026-05-20"))).toBe(0); // Wed before create
    expect(getExpectedVerifiedForWeek(g, d("2026-05-21"))).toBe(1); // Thu
  });
});

describe("shortWeekLabel", () => {
  it("returns signup-week copy with weekday for prorated weeks only", () => {
    const g = goal({ timesPerWeek: 3, createdAt: "2026-05-21T10:00:00.000Z" });
    expect(shortWeekLabel(g, d("2026-05-22"))).toBe("Short week — started Thu · no penalty if you miss");
    expect(shortWeekLabel(g, d("2026-05-28"))).toBeNull();
  });

  it("does not show short week when goal was created on Sunday (full week)", () => {
    const g = goal({ timesPerWeek: 3, createdAt: "2026-05-24T10:00:00.000Z" });
    expect(shortWeekLabel(g, d("2026-05-27"))).toBeNull();
  });

  it("does not show short week on first proof in a later calendar week", () => {
    const g = goal({ timesPerWeek: 6, createdAt: "2026-05-21T10:00:00.000Z" }); // Thu signup week
    expect(getEffectiveQuotaForWeek(g, d("2026-05-28"))).toBe(6);
    expect(shortWeekLabel(g, d("2026-05-28"))).toBeNull();
  });
});
