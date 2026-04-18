import { describe, expect, it } from "vitest";
import { readResendErrorMessage } from "./resendHttp";

describe("readResendErrorMessage", () => {
  it("reads message from JSON", async () => {
    const res = new Response(JSON.stringify({ message: "Domain not verified" }), {
      status: 403,
    });
    await expect(readResendErrorMessage(res)).resolves.toBe("Domain not verified");
  });

  it("reads error string from JSON", async () => {
    const res = new Response(JSON.stringify({ error: "Invalid API key" }), { status: 401 });
    await expect(readResendErrorMessage(res)).resolves.toBe("Invalid API key");
  });

  it("falls back to truncated plain text", async () => {
    const long = "x".repeat(250);
    const res = new Response(long, { status: 500 });
    const msg = await readResendErrorMessage(res);
    expect(msg.endsWith("…")).toBe(true);
    expect(msg.length).toBeLessThanOrEqual(200);
  });

  it("handles empty body", async () => {
    const res = new Response("", { status: 502 });
    await expect(readResendErrorMessage(res)).resolves.toMatch(/502/);
  });
});
