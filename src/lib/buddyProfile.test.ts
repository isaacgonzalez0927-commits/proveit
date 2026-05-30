import { describe, expect, it } from "vitest";
import {
  generateBuddyFriendCode,
  normalizeBuddyFriendCode,
  normalizeBuddyVisibility,
  sanitizeBuddyAvatarPlant,
  sanitizeBuddyProfileAccent,
} from "@/lib/buddyProfile";

describe("buddyProfile", () => {
  it("generates friend codes of expected length", () => {
    const code = generateBuddyFriendCode();
    expect(code).toHaveLength(8);
    expect(code).toMatch(/^[A-Z0-9]+$/);
  });

  it("normalizes friend codes", () => {
    expect(normalizeBuddyFriendCode(" ab-cd12ef ")).toBe("ABCD12EF");
    expect(normalizeBuddyFriendCode("x")).toBeNull();
  });

  it("clamps avatar plant by plan", () => {
    expect(sanitizeBuddyAvatarPlant(8, "free", "goal-1")).toBe(3);
    expect(sanitizeBuddyAvatarPlant(5, "pro", "goal-1")).toBe(7);
    expect(sanitizeBuddyAvatarPlant(5, "premium", "goal-1")).toBe(5);
  });

  it("sanitizes accent for plan", () => {
    expect(sanitizeBuddyProfileAccent("gold", "free")).toBe("green");
    expect(sanitizeBuddyProfileAccent("pink", "pro")).toBe("pink");
  });

  it("normalizes visibility", () => {
    expect(normalizeBuddyVisibility("friend_link")).toBe("friend_link");
    expect(normalizeBuddyVisibility("other")).toBe("shared_goals_only");
  });
});
