import { describe, expect, it, beforeEach } from "vitest";
import { syncGardenWeekMeta, getGardenersNote, setGardenersNote } from "@/lib/gardenMeta";
import { weekStartKey } from "@/lib/graceDays";

const goal = {
  id: "g1",
  frequency: "weekly" as const,
  timesPerWeek: 3,
  archivedAt: undefined as string | undefined,
};

describe("gardenMeta", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("activates recovery after a dead week", () => {
    const priorSyncedWeek = "2026-05-17"; // Sun–Sat week before 2026-05-24
    localStorage.setItem(
      "proveit_garden_meta_v1",
      JSON.stringify({
        g1: {
          syncedWeekStart: priorSyncedWeek,
          perfectWeekStreak: 0,
          bloomThroughWeekStart: null,
          recoverySeasonKey: "2026-05",
          recoveryUsedInSeason: false,
          recoveryActiveWeekStart: null,
        },
      })
    );

    const now = new Date("2026-05-27T12:00:00"); // Wed in week starting 2026-05-24
    const subs = [{ date: "2026-05-20", status: "verified" as const }]; // 1/3 in prior week → dead
    const ctx = syncGardenWeekMeta("g1", goal, subs, [], now);
    expect(ctx.recoveryActive).toBe(true);
  });

  it("stores and returns gardeners note for 24h", () => {
    setGardenersNote("g1", "Nice gym shot!");
    expect(getGardenersNote("g1")).toBe("Nice gym shot!");
  });
});
