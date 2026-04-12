import { afterEach, describe, expect, it } from "vitest";
import { getResendFromOrProductionError } from "@/lib/resendFrom";

describe("getResendFromOrProductionError", () => {
  const saved = { ...process.env };

  afterEach(() => {
    process.env = { ...saved };
  });

  it("uses RESEND_FROM_EMAIL when set", () => {
    process.env.RESEND_FROM_EMAIL = "Proveit <mail@verified.com>";
    expect(getResendFromOrProductionError()).toEqual({
      ok: true,
      from: "Proveit <mail@verified.com>",
    });
  });

  it("returns sandbox from in non-production when unset", () => {
    process.env.NODE_ENV = "development";
    delete process.env.RESEND_FROM_EMAIL;
    const r = getResendFromOrProductionError();
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.from).toContain("onboarding@resend.dev");
  });

  it("errors in production when unset", () => {
    process.env.NODE_ENV = "production";
    delete process.env.RESEND_FROM_EMAIL;
    const r = getResendFromOrProductionError();
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(503);
      expect(r.error).toMatch(/RESEND_FROM_EMAIL/i);
    }
  });
});
