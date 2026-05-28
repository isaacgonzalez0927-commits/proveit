import { describe, expect, it } from "vitest";
import { collageShareFilename } from "./shareCollageImage";
import { progressShareFilename } from "./shareProgressImage";

describe("collageShareFilename", () => {
  it("uses week start in filename", () => {
    expect(
      collageShareFilename({
        weekStart: "2026-05-25",
        weekEnd: "2026-05-31",
        label: "May 25 – May 31, 2026",
        photos: [],
        proofCount: 0,
      })
    ).toBe("proveit-collage-2026-05-25.png");
  });
});

describe("progressShareFilename", () => {
  it("includes date prefix", () => {
    expect(progressShareFilename()).toMatch(/^proveit-progress-\d{4}-\d{2}-\d{2}\.png$/);
  });
});
