import { describe, expect, it } from "vitest";
import {
  evaluateClipLabelScores,
  makeLabels,
  omitsMainWordLabelsForActivityPhrase,
} from "./clipVerifyLabels";

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
    const { verified, confidence } = evaluateClipLabelScores(scores, positiveLabels, T, {
      margin: M,
    });
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
    const { verified, confidence } = evaluateClipLabelScores(scores, positiveLabels, T, {
      margin: M,
    });
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
    const { verified } = evaluateClipLabelScores(scores, positiveLabels, T, { margin: M });
    expect(verified).toBe(false);
  });

  it("rejects when top is positive but below absolute threshold", () => {
    const positiveLabels = ["a photo of gym"];
    const scores = [
      { label: "a photo of gym", score: 0.22 },
      { label: "a random irrelevant picture", score: 0.15 },
    ];
    const { verified } = evaluateClipLabelScores(scores, positiveLabels, T, { margin: M });
    expect(verified).toBe(false);
  });

  it("rejects when main-word labels lack combined mass despite strong top positive", () => {
    const mainWordLabels = ["a photo of a dog", "a clear close-up of a dog", "dog clearly visible in the photo"];
    const positiveLabels = ["a photo of gym", "a photo of a dog", ...mainWordLabels];
    const scores = [
      { label: "a photo of gym", score: 0.4 },
      { label: "a random irrelevant picture", score: 0.18 },
      { label: "a photo of a dog", score: 0.05 },
      { label: "a clear close-up of a dog", score: 0.04 },
      { label: "dog clearly visible in the photo", score: 0.01 },
    ];
    const { verified } = evaluateClipLabelScores(scores, positiveLabels, T, {
      margin: M,
      mainWordLabels,
      mainWordFloor: 0.1,
    });
    expect(verified).toBe(false);
  });

  it("accepts via phrase-soft pass when mainWordLabels empty and top positive is slightly below threshold", () => {
    const positiveLabels = ["a photo of go to bed", "a person sleeping"];
    const scores = [
      { label: "a photo of go to bed", score: 0.24 },
      { label: "a random irrelevant picture", score: 0.16 },
      { label: "a blank or unrelated photo", score: 0.14 },
    ];
    const { verified, confidence } = evaluateClipLabelScores(scores, positiveLabels, 0.28, {
      margin: 0.02,
      mainWordLabels: [],
    });
    expect(verified).toBe(true);
    expect(confidence).toBeCloseTo(0.24, 5);
  });

  it("accepts via subject secondary when laptop labels beat negatives but top softmax is below threshold", () => {
    const mainWordLabels = [
      "a photo of a laptop",
      "a clear close-up of a laptop",
      "laptop clearly visible in the photo",
      "someone using a laptop",
      "laptop as the main subject of the photo",
    ];
    const positiveLabels = ["a photo of use laptop", "a photo of a laptop", ...mainWordLabels];
    const scores = [
      { label: "a photo of a laptop", score: 0.17 },
      { label: "a clear close-up of a laptop", score: 0.1 },
      { label: "laptop clearly visible in the photo", score: 0.06 },
      { label: "someone using a laptop", score: 0.04 },
      { label: "laptop as the main subject of the photo", score: 0.03 },
      { label: "a blank or unrelated photo", score: 0.12 },
      { label: "a random irrelevant picture", score: 0.1 },
    ];
    const { verified, confidence } = evaluateClipLabelScores(scores, positiveLabels, T, {
      margin: M,
      mainWordLabels,
      mainWordFloor: 0.1,
    });
    expect(verified).toBe(true);
    expect(confidence).toBeCloseTo(0.17, 5);
  });
});

describe("omitsMainWordLabelsForActivityPhrase", () => {
  it("is true for go/get/come/head … to … patterns", () => {
    expect(omitsMainWordLabelsForActivityPhrase("go to bed")).toBe(true);
    expect(omitsMainWordLabelsForActivityPhrase("Go to bed early")).toBe(true);
    expect(omitsMainWordLabelsForActivityPhrase("get to sleep")).toBe(true);
    expect(omitsMainWordLabelsForActivityPhrase("coming to terms")).toBe(true);
    expect(omitsMainWordLabelsForActivityPhrase("heading to work")).toBe(true);
  });

  it("is true for wake up", () => {
    expect(omitsMainWordLabelsForActivityPhrase("wake up early")).toBe(true);
    expect(omitsMainWordLabelsForActivityPhrase("Waking up")).toBe(true);
  });

  it("is false for noun-led goals", () => {
    expect(omitsMainWordLabelsForActivityPhrase("walk the dog")).toBe(false);
    expect(omitsMainWordLabelsForActivityPhrase("use laptop")).toBe(false);
    expect(omitsMainWordLabelsForActivityPhrase("gym 3x week")).toBe(false);
  });
});

describe("makeLabels phrase-only goals", () => {
  it("omits mainWord and mainWordLabels for go to bed so CLIP matches the activity phrase", () => {
    const { mainWord, mainWordLabels } = makeLabels("go to bed");
    expect(mainWord).toBeNull();
    expect(mainWordLabels).toEqual([]);
    expect(
      makeLabels("go to bed").positive.some((p) => p.includes("go to bed") || p.includes("bed"))
    ).toBe(true);
  });

  it("keeps mainWord for laptop goals", () => {
    const { mainWord, mainWordLabels } = makeLabels("use laptop");
    expect(mainWord).toBe("laptop");
    expect(mainWordLabels.length).toBeGreaterThan(0);
  });
});
