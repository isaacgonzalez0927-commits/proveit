import { describe, expect, it } from "vitest";
import { format } from "date-fns";
import {
  computeMemberProgress,
  displayNameFromProfile,
  friendGoalShareMessage,
  generateFriendInviteCode,
} from "./friendGoals";

describe("friendGoals", () => {
  it("generates 8-char invite codes", () => {
    const code = generateFriendInviteCode();
    expect(code).toHaveLength(8);
    expect(code).toMatch(/^[A-Z2-9]+$/);
  });

  it("picks display name from username first", () => {
    expect(displayNameFromProfile({ username: "runner", email: "a@b.com" })).toBe("runner");
    expect(displayNameFromProfile({ email: "alex@example.com" })).toBe("alex");
  });

  it("computes weekly progress", () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const goal = { id: "g1", frequency: "weekly" as const, timesPerWeek: 3 as const, isOnBreak: false };
    const subs = [{ date: today, status: "verified" as const }];
    const p = computeMemberProgress(goal, subs, today);
    expect(p.weekTarget).toBe(3);
    expect(p.weekDone).toBeGreaterThanOrEqual(1);
    expect(p.provedToday).toBe(true);
  });

  it("builds share message with url", () => {
    const msg = friendGoalShareMessage("Run", "https://proveit-goals.com/join/ABC");
    expect(msg).toContain("Run");
    expect(msg).toContain("https://proveit-goals.com/join/ABC");
  });
});
