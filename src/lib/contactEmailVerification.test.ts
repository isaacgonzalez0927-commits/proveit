import { describe, expect, it } from "vitest";
import { isContactEmailVerified } from "./contactEmailVerification";

describe("isContactEmailVerified", () => {
  it("false when email missing", () => {
    expect(isContactEmailVerified({ contact_email_verified_at: "2026-01-01T00:00:00.000Z" })).toBe(false);
  });

  it("false when not verified", () => {
    expect(isContactEmailVerified({ contact_email: "a@b.co" })).toBe(false);
  });

  it("true when verified timestamp set", () => {
    expect(
      isContactEmailVerified({
        contact_email: "a@b.co",
        contact_email_verified_at: "2026-01-01T00:00:00.000Z",
      })
    ).toBe(true);
  });
});
