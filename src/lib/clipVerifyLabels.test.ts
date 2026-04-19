import { describe, expect, it } from "vitest";
import { evaluateClipLabelScores } from "./clipVerifyLabels";

const T = 0.28;
const M = 0.02;

describe("evaluateClipLabelScores", () => {
  it("rejects when the top label is negative even if some positives score well", () => {
    const positiveLabels = ["a photo of gym", "a person gym"];
    const scores = [
      { label: "a random irrelevant picture", score: 0.34 },
      { label: "a photo of gym", score: 0.33 },
      { label: "a person gym", score: 0.33 },
    ];
    const { verified, confidence } = evaluateClipLabelScores(scores, positiveLabels, T, M);
    expect(confidence).toBeCloseTo(0.33, 5);
    expect(verified).toBe(false);
  });

  it("accepts when top is a positive label, clears threshold, and beats negatives by margin", () => {
    const positiveLabels = ["a photo of gym", "a person gym"];
    const scores = [
      { label: "a photo of gym", score: 0.45 },
      { label: "a person gym", score: 0.25 },
      { label: "a random irrelevant picture", score: 0.2 },
    ];
    const { verified, confidence } = evaluateClipLabelScores(scores, positiveLabels, T, M);
    expect(confidence).toBeCloseTo(0.45, 5);
    expect(verified).toBe(true);
  });

  it("rejects when top is positive but does not beat best negative by margin", () => {
    const positiveLabels = ["a photo of gym", "a person gym"];
    const scores = [
      { label: "a photo of gym", score: 0.31 },
      { label: "a random irrelevant picture", score: 0.3 },
      { label: "a person gym", score: 0.28 },
    ];
    const { verified } = evaluateClipLabelScores(scores, positiveLabels, T, M);
    expect(verified).toBe(false);
  });

  it("rejects when top is positive but below absolute threshold", () => {
    const positiveLabels = ["a photo of gym"];
    const scores = [
      { label: "a photo of gym", score: 0.22 },
      { label: "a random irrelevant picture", score: 0.15 },
    ];
    const { verified } = evaluateClipLabelScores(scores, positiveLabels, T, M);
    expect(verified).toBe(false);
  });
});
