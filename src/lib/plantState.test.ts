import { describe, expect, it } from "vitest";
import {
  applyRecoveryWeekCap,
  getPlantHydration,
  getWeeklyPlantState,
} from "@/lib/plantState";

const goal = {
  id: "g1",
  frequency: "weekly" as const,
  timesPerWeek: 3,
  archivedAt: undefined as string | undefined,
  createdAt: "2026-01-01T00:00:00.000Z",
};

function d(iso: string) {
  return new Date(iso + "T12:00:00");
}

describe("getWeeklyPlantState (softer wilt)", () => {
  it("stays healthy mid-week with 0 proofs when pace allows", () => {
    const state = getWeeklyPlantState(goal, [], [], d("2026-05-27")); // Wed
    expect(state).toBe("healthy");
  });

  it("wilts late week with zero proofs on a 3x goal", () => {
    const state = getWeeklyPlantState(goal, [], [], d("2026-05-29")); // Fri
    expect(state).toBe("wilting");
  });

  it("is dead on Saturday when quota unmet", () => {
    const state = getWeeklyPlantState(goal, [], [], d("2026-05-30")); // Sat
    expect(state).toBe("dead");
  });

  it("does not kill the plant on Saturday during a missed prorated signup week", () => {
    const signupGoal = {
      ...goal,
      timesPerWeek: 6 as const,
      createdAt: "2026-05-21T10:00:00.000Z",
    };
    const state = getWeeklyPlantState(signupGoal, [], [], d("2026-05-23"));
    expect(state).toBe("wilting");
    expect(state).not.toBe("dead");
  });
});

describe("applyRecoveryWeekCap", () => {
  it("caps dead to wilting during recovery before any proof", () => {
    expect(applyRecoveryWeekCap("dead", true, 0)).toBe("wilting");
  });

  it("allows healthy after first verified proof in recovery", () => {
    expect(applyRecoveryWeekCap("healthy", true, 1)).toBe("healthy");
  });
});

describe("getPlantHydration", () => {
  it("reports progress and onPace", () => {
    const subs = [{ date: "2026-05-27", status: "verified" as const }];
    const h = getPlantHydration(goal, subs, [], d("2026-05-27"));
    expect(h.verified).toBe(1);
    expect(h.needed).toBe(3);
    expect(h.progress).toBeCloseTo(1 / 3, 2);
    expect(h.onPace).toBe(true);
  });
});
