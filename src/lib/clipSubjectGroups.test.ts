import { describe, expect, it } from "vitest";
import { makeLabels } from "./clipVerifyLabels";
import { groupMatches, subjectHintsForGoal } from "./clipSubjectGroups";

describe("subjectHintsForGoal", () => {
  it("returns reading-related hints when goal mentions read", () => {
    const hints = subjectHintsForGoal("read 30 minutes", ["read", "minutes"]);
    expect(hints.length).toBeGreaterThan(4);
    expect(hints.some((h) => /book|novel|article|e-reader|magazine/i.test(h))).toBe(true);
  });

  it("returns gym-related hints for exercise goals", () => {
    const hints = subjectHintsForGoal("exercise at gym", ["exercise", "gym"]);
    expect(hints.some((h) => /treadmill|dumbbell|gym|barbell/i.test(h))).toBe(true);
  });
});

describe("groupMatches", () => {
  it("matches multi-word triggers in the goal string", () => {
    expect(groupMatches("feed the cat", new Set(["feed", "cat"]), ["walk the dog"])).toBe(false);
    expect(groupMatches("i walk the dog daily", new Set(["daily", "walk"]), ["walk the dog"])).toBe(true);
  });
});

describe("makeLabels includes grouped subjects", () => {
  it("adds expanded CLIP strings for reading goals", () => {
    const { positive } = makeLabels("Read a novel tonight");
    expect(positive.some((p) => p.toLowerCase().includes("novel"))).toBe(true);
    expect(positive.some((p) => p.toLowerCase().includes("e-reader"))).toBe(true);
  });

  it("adds laptop-focused positives for use my laptop", () => {
    const { positive, mainWord } = makeLabels("use my laptop");
    expect(mainWord).toBe("laptop");
    expect(positive.some((p) => p.includes("keyboard and trackpad"))).toBe(true);
    expect(positive.some((p) => p.toLowerCase().includes("laptop on a desk"))).toBe(true);
  });
});
