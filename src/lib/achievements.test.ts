import { describe, expect, it } from "vitest";
import type { Goal, GraceDayEvent, ProofSubmission, User } from "@/types";
import {
  computeAchievementStats,
  evaluateAllAchievements,
  isPremiumMember,
} from "./achievements";

const user: User = {
  id: "u1",
  email: "a@b.com",
  plan: "premium",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const goal: Goal = {
  id: "g1",
  userId: "u1",
  title: "Run",
  frequency: "daily",
  timesPerWeek: 7,
  createdAt: "2026-01-01T00:00:00.000Z",
  completedDates: [],
};

function sub(id: string, date: string): ProofSubmission {
  return {
    id,
    goalId: "g1",
    date,
    imageDataUrl: "data:image/png;base64,abc",
    status: "verified",
    createdAt: `${date}T12:00:00.000Z`,
  };
}

describe("achievements", () => {
  it("detects premium members", () => {
    expect(isPremiumMember({ ...user, plan: "premium" })).toBe(true);
    expect(isPremiumMember({ ...user, plan: "pro" })).toBe(false);
  });

  it("unlocks first proof for any user", () => {
    const subs = [sub("s1", "2026-04-06")];
    const stats = computeAchievementStats([goal], subs, [], () => subs);
    const progress = evaluateAllAchievements(stats, false, subs);
    expect(progress.find((p) => p.id === "first_proof")?.unlocked).toBe(true);
  });

  it("locks premium achievements for free users", () => {
    const subs = [sub("s1", "2026-04-06")];
    const stats = computeAchievementStats([goal], subs, [], () => subs);
    const progress = evaluateAllAchievements(stats, false, subs);
    expect(progress.find((p) => p.id === "premium_milestone")?.lockedByPlan).toBe(true);
    expect(progress.find((p) => p.id === "premium_milestone")?.unlocked).toBe(false);
  });

  it("unlocks shield saver when a grace day was used", () => {
    const events: GraceDayEvent[] = [
      {
        id: "e1",
        userId: "u1",
        goalId: "g1",
        weekStart: "2026-04-06",
        usedAt: "2026-04-10T00:00:00.000Z",
        createdAt: "2026-04-10T00:00:00.000Z",
      },
    ];
    const stats = computeAchievementStats([goal], [], events, () => []);
    const progress = evaluateAllAchievements(stats, true, []);
    expect(progress.find((p) => p.id === "shield_saver")?.unlocked).toBe(true);
  });
});
