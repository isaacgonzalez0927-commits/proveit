import { afterEach, describe, expect, it } from "vitest";
import {
  getResendFromOrProductionError,
  mustUseVerifiedResendFrom,
  readResendFromEnv,
  trimEnvEmail,
} from "@/lib/resendFrom";

/** `process.env.NODE_ENV` is typed read-only; tests need to flip it safely. */
function setEnvVar(name: string, value: string): void {
  (process.env as Record<string, string | undefined>)[name] = value;
}

describe("trimEnvEmail", () => {
  it("trims and strips double quotes", () => {
    expect(trimEnvEmail('  "Proveit <a@b.com>"  ')).toBe("Proveit <a@b.com>");
  });
  it("returns undefined for empty", () => {
    expect(trimEnvEmail("   ")).toBeUndefined();
  });
});

describe("readResendFromEnv", () => {
  const saved = { ...process.env };

  afterEach(() => {
    process.env = { ...saved };
  });

  it("prefers RESEND_FROM_EMAIL over RESEND_FROM", () => {
    process.env.RESEND_FROM = "Wrong <w@w.com>";
    process.env.RESEND_FROM_EMAIL = "Proveit <mail@verified.com>";
    expect(readResendFromEnv()).toBe("Proveit <mail@verified.com>");
  });

  it("falls back to RESEND_FROM", () => {
    delete process.env.RESEND_FROM_EMAIL;
    process.env.RESEND_FROM = "Proveit <fallback@verified.com>";
    expect(readResendFromEnv()).toBe("Proveit <fallback@verified.com>");
  });

  it("falls back to NEXT_PUBLIC_RESEND_FROM_EMAIL", () => {
    delete process.env.RESEND_FROM_EMAIL;
    delete process.env.RESEND_FROM;
    process.env.NEXT_PUBLIC_RESEND_FROM_EMAIL = "Proveit <pub@verified.com>";
    expect(readResendFromEnv()).toBe("Proveit <pub@verified.com>");
  });

  it("falls back to RESEND_EMAIL_FROM after other keys", () => {
    delete process.env.RESEND_FROM_EMAIL;
    delete process.env.RESEND_FROM;
    delete process.env.EMAIL_FROM;
    delete process.env.MAIL_FROM;
    delete process.env.NEXT_PUBLIC_RESEND_FROM_EMAIL;
    process.env.RESEND_EMAIL_FROM = "Proveit <alias@verified.com>";
    expect(readResendFromEnv()).toBe("Proveit <alias@verified.com>");
  });
});

describe("getResendFromOrProductionError", () => {
  const saved = { ...process.env };

  afterEach(() => {
    process.env = { ...saved };
  });

  it("uses RESEND_FROM_EMAIL when set", () => {
    setEnvVar("NODE_ENV", "production");
    process.env.VERCEL_ENV = "production";
    process.env.RESEND_FROM_EMAIL = "Proveit <mail@verified.com>";
    expect(getResendFromOrProductionError()).toEqual({
      ok: true,
      from: "Proveit <mail@verified.com>",
    });
  });

  it("returns sandbox from in development when unset", () => {
    setEnvVar("NODE_ENV", "development");
    delete process.env.RESEND_FROM_EMAIL;
    delete process.env.RESEND_FROM;
    delete process.env.NEXT_PUBLIC_RESEND_FROM_EMAIL;
    const r = getResendFromOrProductionError();
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.from).toContain("onboarding@resend.dev");
  });

  it("allows sandbox on Vercel Preview without RESEND_FROM_EMAIL", () => {
    setEnvVar("NODE_ENV", "production");
    process.env.VERCEL_ENV = "preview";
    delete process.env.RESEND_FROM_EMAIL;
    const r = getResendFromOrProductionError();
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.from).toContain("onboarding@resend.dev");
  });

  it("errors on Vercel Production when unset", () => {
    setEnvVar("NODE_ENV", "production");
    process.env.VERCEL_ENV = "production";
    delete process.env.RESEND_FROM_EMAIL;
    delete process.env.RESEND_FROM;
    delete process.env.EMAIL_FROM;
    delete process.env.MAIL_FROM;
    delete process.env.NEXT_PUBLIC_RESEND_FROM_EMAIL;
    const r = getResendFromOrProductionError();
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(503);
      expect(r.error).toMatch(/RESEND_FROM_EMAIL/i);
      expect(r.error).toMatch(/Redeploy/i);
    }
  });
});

describe("mustUseVerifiedResendFrom", () => {
  const saved = { ...process.env };

  afterEach(() => {
    process.env = { ...saved };
  });

  it("is false in dev", () => {
    setEnvVar("NODE_ENV", "development");
    expect(mustUseVerifiedResendFrom()).toBe(false);
  });

  it("is false on Vercel preview", () => {
    setEnvVar("NODE_ENV", "production");
    process.env.VERCEL_ENV = "preview";
    expect(mustUseVerifiedResendFrom()).toBe(false);
  });

  it("is true on Vercel production", () => {
    setEnvVar("NODE_ENV", "production");
    process.env.VERCEL_ENV = "production";
    expect(mustUseVerifiedResendFrom()).toBe(true);
  });
});
