import { describe, expect, it } from "vitest";
import { aiCoachUtcWeekKey, effectiveAiCoachCount, getAiCoachRemaining } from "./aiCoachUsage";
import { getAiVerificationLimit, getAiVerificationCycleKind } from "./subscriptionLimits";

describe("aiCoachUtcWeekKey", () => {
  it("returns Monday UTC for mid-week and Sunday", () => {
    // 2026-08-05 is Wednesday UTC
    expect(aiCoachUtcWeekKey(new Date("2026-08-05T15:00:00.000Z"))).toBe("2026-08-03");
    // Sunday belongs to the week that started the prior Monday
    expect(aiCoachUtcWeekKey(new Date("2026-08-09T12:00:00.000Z"))).toBe("2026-08-03");
    // Monday itself
    expect(aiCoachUtcWeekKey(new Date("2026-08-03T00:00:00.000Z"))).toBe("2026-08-03");
  });
});

describe("AI Coach weekly limits", () => {
  it("caps Free / Pro / Premium per UTC week", () => {
    expect(getAiVerificationLimit("free")).toBe(3);
    expect(getAiVerificationLimit("pro")).toBe(5);
    expect(getAiVerificationLimit("premium")).toBe(20);
    expect(getAiVerificationCycleKind("pro")).toBe("week");
  });

  it("computes remaining uses with week rollover", () => {
    const week = aiCoachUtcWeekKey(new Date("2026-08-05T12:00:00.000Z"));
    expect(
      getAiCoachRemaining(
        { plan: "pro", aiVerificationCycleKey: week, aiVerificationCount: 2 },
        new Date("2026-08-05T12:00:00.000Z")
      )
    ).toBe(3);
    expect(
      effectiveAiCoachCount(
        { aiVerificationCycleKey: "2026-07-27", aiVerificationCount: 5 },
        new Date("2026-08-05T12:00:00.000Z")
      )
    ).toBe(0);
  });
});
