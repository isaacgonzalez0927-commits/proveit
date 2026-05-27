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
  it("is always disabled", () => {
    expect(canStartPremiumTrial()).toBe(false);
  });
});

describe("isPremiumTrialActive", () => {
  it("is always false", () => {
    const ends = new Date();
    ends.setUTCDate(ends.getUTCDate() + 1);
    expect(
      isPremiumTrialActive({
        plan: "premium",
        premiumTrialEndsAt: ends.toISOString(),
      })
    ).toBe(false);
  });
});

describe("expireLocalPremiumTrialIfNeeded", () => {
  it("reverts to free when legacy trial ended", () => {
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

  it("clears active legacy trial timestamps", () => {
    const ends = new Date();
    ends.setUTCDate(ends.getUTCDate() + 1);
    const active = {
      ...baseUser(),
      plan: "premium" as const,
      premiumTrialEndsAt: ends.toISOString(),
      premiumTrialRevertPlan: "free" as const,
    };
    const next = expireLocalPremiumTrialIfNeeded(active);
    expect(next.premiumTrialEndsAt).toBeUndefined();
    expect(next.premiumTrialRevertPlan).toBeUndefined();
  });
});
