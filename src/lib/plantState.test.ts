import { describe, expect, it } from "vitest";
import {
  applyWiltGraceCap,
  applyRecoveryWeekCap,
  getPlantHydration,
  getWeeklyPlantState,
} from "@/lib/plantState";

const goal = {
  id: "g1",
  frequency: "weekly" as const,
  timesPerWeek: 3 as const,
  archivedAt: undefined as string | undefined,
  createdAt: "2026-01-01T00:00:00.000Z",
};

function d(iso: string) {
  return new Date(iso + "T12:00:00");
}

describe("getWeeklyPlantState (wilt grace)", () => {
  it("stays healthy mid-week with 0 proofs when pace allows", () => {
    const state = getWeeklyPlantState(goal, [], [], d("2026-05-27")); // Wed
    expect(state).toBe("healthy");
  });

  it("wilts late week with zero proofs on a 3x goal", () => {
    const state = getWeeklyPlantState(goal, [], [], d("2026-05-29")); // Fri
    expect(state).toBe("wilting");
  });

  it("wilts on Saturday when quota unmet — does not instantly die", () => {
    const state = getWeeklyPlantState(goal, [], [], d("2026-05-30")); // Sat
    expect(state).toBe("wilting");
    expect(state).not.toBe("dead");
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

  it("shows dead only when garden meta marks plantDead", () => {
    const state = getWeeklyPlantState(goal, [], [], d("2026-05-27"), {
      plantDead: true,
    });
    expect(state).toBe("dead");
  });
});

describe("applyWiltGraceCap", () => {
  it("caps dead to wilting during wilt grace", () => {
    expect(applyWiltGraceCap("dead", { wiltActive: true }, 0)).toBe("wilting");
  });

  it("keeps dead when plantDead is set", () => {
    expect(applyWiltGraceCap("wilting", { plantDead: true }, 0)).toBe("dead");
  });

  it("keeps recovery alias working", () => {
    expect(applyRecoveryWeekCap("dead", true, 0)).toBe("wilting");
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

  it("surfaces wilt week copy fields from garden context", () => {
    const h = getPlantHydration(goal, [], [], d("2026-05-27"), {
      wiltActive: true,
      recoveryActive: true,
      plantDead: false,
      wiltWeekIndex: 1,
      inBloomSeason: false,
      perfectWeekStreak: 0,
    });
    expect(h.wiltActive).toBe(true);
    expect(h.wiltWeekIndex).toBe(1);
  });
});
