import { describe, expect, it } from "vitest";
import { messageFromApiPayload } from "./apiErrors";

describe("messageFromApiPayload", () => {
  it("uses error string when present", () => {
    expect(messageFromApiPayload({ error: "  boom  " }, "fallback")).toBe("boom");
  });

  it("uses message when error missing", () => {
    expect(messageFromApiPayload({ message: "hello" }, "fallback")).toBe("hello");
  });

  it("prefers error over message", () => {
    expect(messageFromApiPayload({ error: "a", message: "b" }, "f")).toBe("a");
  });

  it("returns fallback for empty or non-object", () => {
    expect(messageFromApiPayload(null, "f")).toBe("f");
    expect(messageFromApiPayload({}, "f")).toBe("f");
    expect(messageFromApiPayload({ error: "" }, "f")).toBe("f");
  });
});
