import { describe, expect, it } from "vitest";
import type { Goal, GraceDayEvent, ProofSubmission, User } from "@/types";
import { FULLY_GROWN_MIN_STREAK } from "./plantGrowth";
import {
  computeAchievementStats,
  evaluateAllAchievements,
  isPremiumMember,
  isProMember,
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
  it("detects pro and premium members", () => {
    expect(isProMember({ ...user, plan: "pro" })).toBe(true);
    expect(isProMember({ ...user, plan: "premium" })).toBe(true);
    expect(isProMember({ ...user, plan: "free" })).toBe(false);
    expect(isPremiumMember({ ...user, plan: "premium" })).toBe(true);
    expect(isPremiumMember({ ...user, plan: "pro" })).toBe(false);
  });

  it("unlocks free hook achievements for free users", () => {
    const subs = [sub("s1", "2026-04-06")];
    const stats = computeAchievementStats([goal], subs, [], () => subs);
    const progress = evaluateAllAchievements(stats, "free", subs);
    expect(progress.find((p) => p.id === "first_goal")?.unlocked).toBe(true);
    expect(progress.find((p) => p.id === "first_proof")?.unlocked).toBe(true);
    expect(progress.find((p) => p.id === "first_full_grown")?.lockedByPlan).toBe(false);
  });

  it("locks pro achievements for free users", () => {
    const subs = [sub("s1", "2026-04-06")];
    const stats = computeAchievementStats([goal], subs, [], () => subs);
    const progress = evaluateAllAchievements(stats, "free", subs);
    expect(progress.find((p) => p.id === "proof_10")?.lockedByPlan).toBe(true);
    expect(progress.find((p) => p.id === "proof_10")?.unlocked).toBe(false);
  });

  it("unlocks first proof for pro users", () => {
    const subs = [sub("s1", "2026-04-06")];
    const stats = computeAchievementStats([goal], subs, [], () => subs);
    const progress = evaluateAllAchievements(stats, "pro", subs);
    expect(progress.find((p) => p.id === "first_proof")?.unlocked).toBe(true);
  });

  it("locks premium achievements for pro users", () => {
    const subs = [sub("s1", "2026-04-06")];
    const stats = computeAchievementStats([goal], subs, [], () => subs);
    const progress = evaluateAllAchievements(stats, "pro", subs);
    expect(progress.find((p) => p.id === "premium_milestone")?.lockedByPlan).toBe(true);
    expect(progress.find((p) => p.id === "premium_milestone")?.unlocked).toBe(false);
  });

  it("unlocks fully grown when max streak reaches final plant stage", () => {
    const stats = {
      totalGoals: 1,
      totalProofs: 12,
      maxStreak: FULLY_GROWN_MIN_STREAK,
      activeGoals: 1,
      perfectWeeks: 0,
      shieldsUsed: 0,
      weeksWithProofs: 1,
    };
    const progress = evaluateAllAchievements(stats, "free", []);
    expect(progress.find((p) => p.id === "first_full_grown")?.unlocked).toBe(true);
  });

  it("unlocks shield saver when a grace day was used on pro", () => {
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
    const progress = evaluateAllAchievements(stats, "pro", []);
    expect(progress.find((p) => p.id === "shield_saver")?.unlocked).toBe(true);
  });
});
