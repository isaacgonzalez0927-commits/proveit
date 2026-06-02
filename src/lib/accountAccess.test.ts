import { describe, expect, it } from "vitest";
import { hasDevPremiumAccess } from "@/lib/accountAccess";

describe("hasDevPremiumAccess", () => {
  it("grants creator emails", () => {
    expect(hasDevPremiumAccess("isaacgonzalez0927@gmail.com", null)).toBe(true);
    expect(hasDevPremiumAccess("ranchdressing971@gmail.com", null)).toBe(true);
  });

  it("denies regular users", () => {
    expect(hasDevPremiumAccess("stranger@example.com", null)).toBe(false);
  });
});
