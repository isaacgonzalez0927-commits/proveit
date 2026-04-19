import { describe, expect, it } from "vitest";
import { evaluateClipLabelScores } from "./clipVerifyLabels";

describe("evaluateClipLabelScores", () => {
  it("rejects when combined positive mass clears threshold but top label is negative", () => {
    const positiveLabels = ["a photo of gym", "a person gym"];
    const scores = [
      { label: "a random irrelevant picture", score: 0.34 },
      { label: "a photo of gym", score: 0.33 },
      { label: "a person gym", score: 0.33 },
    ];
    const { verified, confidence } = evaluateClipLabelScores(scores, positiveLabels, 0.65);
    expect(confidence).toBeCloseTo(0.66, 5);
    expect(verified).toBe(false);
  });

  it("accepts when top label is positive and confidence clears threshold", () => {
    const positiveLabels = ["a photo of gym", "a person gym"];
    const scores = [
      { label: "a photo of gym", score: 0.45 },
      { label: "a person gym", score: 0.35 },
      { label: "a random irrelevant picture", score: 0.2 },
    ];
    const { verified, confidence } = evaluateClipLabelScores(scores, positiveLabels, 0.65);
    expect(confidence).toBeCloseTo(0.8, 5);
    expect(verified).toBe(true);
  });
});
