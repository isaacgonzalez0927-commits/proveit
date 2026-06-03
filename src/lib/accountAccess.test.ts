import { describe, expect, it } from "vitest";
import {
  applyDevPremiumGrantIfNeeded,
  DEV_GRANTED_PLAN,
  hasDevPremiumAccess,
  resolveEffectivePlanForAccount,
} from "@/lib/accountAccess";

describe("hasDevPremiumAccess", () => {
  it("grants creator emails", () => {
    expect(hasDevPremiumAccess("isaacgonzalez0927@gmail.com", null)).toBe(true);
    expect(hasDevPremiumAccess("ranchdressing971@gmail.com", null)).toBe(true);
  });

  it("grants dev username internal auth email", () => {
    expect(hasDevPremiumAccess("yily@proveit.account.internal", null)).toBe(true);
  });

  it("falls back to auth session email", () => {
    expect(hasDevPremiumAccess(null, null, "isaacgonzalez0927@gmail.com")).toBe(true);
  });

  it("denies regular users", () => {
    expect(hasDevPremiumAccess("stranger@example.com", null)).toBe(false);
  });
});

describe("applyDevPremiumGrantIfNeeded", () => {
  it("upgrades dev accounts to premium locally", () => {
    const next = applyDevPremiumGrantIfNeeded({
      email: "isaacgonzalez0927@gmail.com",
      plan: "free",
    });
    expect(next.plan).toBe(DEV_GRANTED_PLAN);
  });
});

describe("resolveEffectivePlanForAccount", () => {
  it("grants premium entitlements for dev auth email when DB plan is free", () => {
    expect(
      resolveEffectivePlanForAccount("free", { email: "stranger@example.com" }, "isaacgonzalez0927@gmail.com")
    ).toBe("premium");
  });

  it("keeps stored plan for non-dev accounts", () => {
    expect(resolveEffectivePlanForAccount("pro", { email: "stranger@example.com" }, "stranger@example.com")).toBe(
      "pro"
    );
  });
});
