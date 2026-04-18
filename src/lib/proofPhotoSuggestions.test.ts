import { describe, expect, it } from "vitest";
import { getProofPhotoSuggestions } from "./proofPhotoSuggestions";

describe("getProofPhotoSuggestions", () => {
  it("returns three lines for non-empty goal text", () => {
    const s = getProofPhotoSuggestions("running");
    expect(s).toHaveLength(3);
    expect(s.every((line) => line.includes("running"))).toBe(true);
  });

  it("returns empty for blank", () => {
    expect(getProofPhotoSuggestions("   ")).toEqual([]);
  });
});
