import { describe, expect, it } from "vitest";
import {
  effectiveTimesPerWeek,
  spreadReminderDaysForTimesPerWeek,
  timesPerWeekSummary,
} from "./goalSchedule";
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
