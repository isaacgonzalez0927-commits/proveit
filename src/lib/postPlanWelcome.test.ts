import { describe, expect, it, beforeEach } from "vitest";
import {
  clearPostPlanWelcomeFlag,
  peekPostPlanWelcomePlanId,
  setPostPlanWelcomeFlag,
} from "./postPlanWelcome";

beforeEach(() => {
  sessionStorage.clear();
});

describe("postPlanWelcome", () => {
  it("peek returns null when unset", () => {
    expect(peekPostPlanWelcomePlanId()).toBeNull();
  });

  it("set then peek returns plan until cleared", () => {
    setPostPlanWelcomeFlag("pro");
    expect(peekPostPlanWelcomePlanId()).toBe("pro");
    expect(peekPostPlanWelcomePlanId()).toBe("pro");
    clearPostPlanWelcomeFlag();
    expect(peekPostPlanWelcomePlanId()).toBeNull();
  });

  it("accepts premium", () => {
    setPostPlanWelcomeFlag("premium");
    expect(peekPostPlanWelcomePlanId()).toBe("premium");
  });
});
