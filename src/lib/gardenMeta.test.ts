import { describe, expect, it, beforeEach } from "vitest";
import {
  syncGardenWeekMeta,
  getGardenersNote,
  setGardenersNote,
  completeGardenRecovery,
  WILT_GRACE_WEEKS,
} from "@/lib/gardenMeta";

const goal = {
  id: "g1",
  frequency: "weekly" as const,
  timesPerWeek: 3 as const,
  archivedAt: undefined as string | undefined,
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("gardenMeta wilt grace", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts a 2-week wilt after a missed week (not instant death)", () => {
    const priorSyncedWeek = "2026-05-17"; // week before 2026-05-24
    localStorage.setItem(
      "proveit_garden_meta_v1",
      JSON.stringify({
        g1: {
          syncedWeekStart: priorSyncedWeek,
          perfectWeekStreak: 0,
          bloomThroughWeekStart: null,
          wiltThroughWeekStart: null,
          plantDead: false,
        },
      })
    );

    const now = new Date("2026-05-27T12:00:00"); // Wed in week starting 2026-05-24
    const subs = [{ date: "2026-05-20", status: "verified" as const }]; // 1/3 prior week
    const ctx = syncGardenWeekMeta("g1", goal, subs, [], now);
    expect(ctx.wiltActive).toBe(true);
    expect(ctx.recoveryActive).toBe(true);
    expect(ctx.plantDead).toBe(false);
    expect(ctx.wiltWeekIndex).toBe(1);
    expect(WILT_GRACE_WEEKS).toBe(2);
  });

  it("stays wilting in week 2 of grace", () => {
    localStorage.setItem(
      "proveit_garden_meta_v1",
      JSON.stringify({
        g1: {
          syncedWeekStart: "2026-05-24",
          perfectWeekStreak: 0,
          bloomThroughWeekStart: null,
          wiltThroughWeekStart: "2026-05-31",
          plantDead: false,
        },
      })
    );
    const now = new Date("2026-06-03T12:00:00"); // week of 2026-05-31
    const ctx = syncGardenWeekMeta("g1", goal, [], [], now);
    expect(ctx.wiltActive).toBe(true);
    expect(ctx.wiltWeekIndex).toBe(2);
    expect(ctx.plantDead).toBe(false);
  });

  it("marks plant dead after wilt window with no revive proof", () => {
    localStorage.setItem(
      "proveit_garden_meta_v1",
      JSON.stringify({
        g1: {
          syncedWeekStart: "2026-05-31",
          perfectWeekStreak: 0,
          bloomThroughWeekStart: null,
          wiltThroughWeekStart: "2026-05-31",
          plantDead: false,
        },
      })
    );
    const now = new Date("2026-06-10T12:00:00"); // week of 2026-06-07
    const ctx = syncGardenWeekMeta("g1", goal, [], [], now);
    expect(ctx.wiltActive).toBe(false);
    expect(ctx.plantDead).toBe(true);
  });

  it("revives on proof without restoring wilt state", () => {
    localStorage.setItem(
      "proveit_garden_meta_v1",
      JSON.stringify({
        g1: {
          syncedWeekStart: "2026-05-24",
          perfectWeekStreak: 0,
          bloomThroughWeekStart: null,
          wiltThroughWeekStart: "2026-05-31",
          plantDead: false,
        },
      })
    );
    completeGardenRecovery("g1");
    const now = new Date("2026-05-27T12:00:00");
    const ctx = syncGardenWeekMeta("g1", goal, [{ date: "2026-05-26", status: "verified" }], [], now);
    expect(ctx.wiltActive).toBe(false);
    expect(ctx.plantDead).toBe(false);
  });

  it("does not start wilt after a missed prorated signup week", () => {
    const signupGoal = {
      ...goal,
      timesPerWeek: 6 as const,
      createdAt: "2026-05-21T10:00:00.000Z",
    };
    localStorage.setItem(
      "proveit_garden_meta_v1",
      JSON.stringify({
        g1: {
          syncedWeekStart: "2026-05-17",
          perfectWeekStreak: 2,
          bloomThroughWeekStart: null,
          wiltThroughWeekStart: null,
          plantDead: false,
        },
      })
    );

    const now = new Date("2026-05-27T12:00:00");
    const subs = [{ date: "2026-05-21", status: "verified" as const }];
    const ctx = syncGardenWeekMeta("g1", signupGoal, subs, [], now);
    expect(ctx.wiltActive).toBe(false);
    expect(ctx.plantDead).toBe(false);
  });

  it("stores and returns gardeners note for 24h", () => {
    setGardenersNote("g1", "Nice gym shot!");
    expect(getGardenersNote("g1")).toBe("Nice gym shot!");
  });
});
