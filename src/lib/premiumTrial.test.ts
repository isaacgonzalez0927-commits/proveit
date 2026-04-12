import { describe, expect, it } from "vitest";
import {
  canStartPremiumTrial,
  expireLocalPremiumTrialIfNeeded,
  isPremiumTrialActive,
} from "./premiumTrial";
import type { StoredUser } from "./store";

const baseUser = (): StoredUser => ({
  id: "u1",
  email: "a@b.co",
  plan: "free",
  createdAt: new Date().toISOString(),
});

describe("canStartPremiumTrial", () => {
  it("allows free user who has not used trial", () => {
    expect(canStartPremiumTrial({ plan: "free", premiumTrialUsed: false })).toBe(true);
    expect(canStartPremiumTrial({ plan: "free" })).toBe(true);
  });

  it("blocks premium plan", () => {
    expect(canStartPremiumTrial({ plan: "premium", premiumTrialUsed: false })).toBe(false);
  });

  it("blocks after trial used", () => {
    expect(canStartPremiumTrial({ plan: "free", premiumTrialUsed: true })).toBe(false);
    expect(canStartPremiumTrial({ plan: "pro", premiumTrialUsed: true })).toBe(false);
  });

  it("blocks null user", () => {
    expect(canStartPremiumTrial(null)).toBe(false);
  });
});

describe("isPremiumTrialActive", () => {
  it("true when premium and end in future", () => {
    const ends = new Date();
    ends.setUTCDate(ends.getUTCDate() + 1);
    expect(
      isPremiumTrialActive({
        plan: "premium",
        premiumTrialEndsAt: ends.toISOString(),
      })
    ).toBe(true);
  });

  it("false when end in past", () => {
    expect(
      isPremiumTrialActive({
        plan: "premium",
        premiumTrialEndsAt: "2020-01-01T00:00:00.000Z",
      })
    ).toBe(false);
  });

  it("false when no end date", () => {
    expect(isPremiumTrialActive({ plan: "premium", premiumTrialEndsAt: null })).toBe(false);
  });
});

describe("expireLocalPremiumTrialIfNeeded", () => {
  it("reverts to free when trial ended", () => {
    const u = baseUser();
    const ended = {
      ...u,
      plan: "premium" as const,
      premiumTrialEndsAt: "2020-01-01T00:00:00.000Z",
      premiumTrialRevertPlan: "free" as const,
      planBilling: "monthly" as const,
    };
    const next = expireLocalPremiumTrialIfNeeded(ended);
    expect(next.plan).toBe("free");
    expect(next.premiumTrialEndsAt).toBeUndefined();
    expect(next.planBilling).toBeUndefined();
  });

  it("reverts to pro when configured", () => {
    const u = baseUser();
    const ended = {
      ...u,
      plan: "premium" as const,
      premiumTrialEndsAt: "2020-01-01T00:00:00.000Z",
      premiumTrialRevertPlan: "pro" as const,
      planBilling: "yearly" as const,
    };
    const next = expireLocalPremiumTrialIfNeeded(ended);
    expect(next.plan).toBe("pro");
    expect(next.planBilling).toBe("yearly");
  });
});
