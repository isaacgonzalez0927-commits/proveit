import { describe, expect, it } from "vitest";
import {
  isValidAccountEmail,
  normalizeAccountEmail,
} from "@/lib/accountEmailUniqueness";
import { usernameToAuthEmail } from "@/lib/usernameAuth";

describe("accountEmailUniqueness", () => {
  it("normalizes email to lowercase", () => {
    expect(normalizeAccountEmail("  User@Example.COM ")).toBe("user@example.com");
  });

  it("validates real emails", () => {
    expect(isValidAccountEmail("a@b.co")).toBe(true);
    expect(isValidAccountEmail("not-an-email")).toBe(false);
  });

  it("treats internal auth emails as invalid for contact checks", () => {
    expect(isValidAccountEmail(usernameToAuthEmail("runner"))).toBe(true);
  });
});
