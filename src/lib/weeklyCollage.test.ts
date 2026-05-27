import { describe, expect, it } from "vitest";
import type { Goal, ProofSubmission } from "@/types";
import { buildWeeklyCollages } from "./weeklyCollage";

const goal: Goal = {
  id: "g1",
  userId: "u1",
  title: "Read",
  frequency: "daily",
  createdAt: "2026-01-01T00:00:00.000Z",
  completedDates: [],
};

function sub(id: string, date: string, image = "data:image/png;base64,abc"): ProofSubmission {
  return {
    id,
    goalId: "g1",
    date,
    imageDataUrl: image,
    status: "verified",
    createdAt: `${date}T12:00:00.000Z`,
  };
}

describe("buildWeeklyCollages", () => {
  it("groups verified photos by calendar week", () => {
    const collages = buildWeeklyCollages(
      [sub("s1", "2026-04-06"), sub("s2", "2026-04-08"), sub("s3", "2026-04-13")],
      [goal],
      { referenceDate: new Date("2026-04-15T12:00:00.000Z"), maxWeeks: 8 }
    );
    expect(collages).toHaveLength(2);
    expect(collages[0]?.proofCount).toBe(1);
    expect(collages[1]?.proofCount).toBe(2);
  });

  it("ignores submissions without images", () => {
    const collages = buildWeeklyCollages(
      [{ ...sub("s1", "2026-04-06"), imageDataUrl: "" }],
      [goal],
      { referenceDate: new Date("2026-04-15T12:00:00.000Z") }
    );
    expect(collages).toHaveLength(0);
  });
});
